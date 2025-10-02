/**
 * in order to use JSX syntax, we need to declare the JSX namespace globally.
 *This is necessary for TypeScript to understand JSX elements and their types.
 *and make it global so that it can be used in any file that imports this module.
*/
declare global {
	namespace JSX {
		interface IntrinsicElements {
			[elemName: string]: any;
		}
	}
}

// ============================================================================
// 1. TYPE DEFINITIONS & ENUMS
// We define all the core types and enums here for clarity and type safety.
// ============================================================================

/**
 * Enum for the different types of effects a fiber can have.
 * This tells the commit phase what to do with the fiber.
 */
const enum EffectTag {
  UPDATE = "UPDATE",
  PLACEMENT = "PLACEMENT",
  DELETION = "DELETION",
}

/**
 * Represents a single unit of work. Fibers are the internal building blocks
 * of the Jarvis renderer. Each component instance has a fiber.
 */
type Fiber = {
  type?: any;
  props: {
    [key: string]: any;
    children: JarvisElement[] | [];
  };
  dom: Node | null;
  parent?: Fiber;
  child?: Fiber | null;
  sibling?: Fiber | null;
  alternate: Fiber | null;
  effectTag?: EffectTag;
  hooks?: Hook<any>[];
};

/**
 * Represents an element created by Jarvis.createElement. This is the public
 * facing "element" type, similar to a React element.
 */
type JarvisElement = {
  type: any;
  props: {
    [key: string]: any;
    children: JarvisElement[] | [];
  };
};

/**
 * Represents a state hook used in function components.
 */
type Hook<T> = {
  state: T;
  queue: ((prevState: T) => T | T)[];
};

/**
 * Action for the setState function. It can be a new value or a function
 * that receives the previous state and returns the new state.
 */
type SetStateAction<T> = T | ((prevState: T) => T);

// ============================================================================
// 2. GLOBAL STATE MANAGEMENT
// These variables manage the rendering lifecycle. They track the work in
// progress, the current tree, and deletions.
// ============================================================================

// The next fiber to be processed in the work loop.
let nextUnitOfWork: Fiber | null = null;
// The root of the fiber tree that is currently committed to the DOM.
let currentRoot: Fiber | null = null;
// The root of the fiber tree that is currently being built (work in progress).
let wipRoot: Fiber | null = null;
// An array of fibers that need to be removed from the DOM.
let deletions: Fiber[] = [];
// The fiber currently being rendered (for hooks).
let wipFiber: Fiber | null = null;
// The index of the current hook being processed.
let hookIndex: number = 0;


// ============================================================================
// 3. CORE API
// The public API for Jarvis, similar to React's.
// ============================================================================

/**
 * Creates a Jarvis element, which is a description of what to render.
 * @param type The type of the element (e.g., 'div', 'h1', or a function component).
 * @param config An object containing props for the element.
 * @param children The children of the element.
 * @returns A Jarvis element object.
 */
function createElement(
  type: any,
  config: { [key: string]: any } | null,
  ...children: (JarvisElement | string | number)[]
): JarvisElement {
  const props: any = { ...config };

  props.children = children.flat().map(child =>
    typeof child === "object" && child !== null ? child : createTextElement((child as string | number))
  );

  return { type, props };
}

/**
 * Renders a Jarvis element into a container DOM node. This is the entry
 * point for a Jarvis application.
 * @param element The Jarvis element to render.
 * @param container The DOM node to render the element into.
 */
function render(element: JarvisElement, container: HTMLElement | null): void {
  wipRoot = {
    dom: container,
    props: { children: [element] },
    alternate: currentRoot,
  };
  deletions = [];
  nextUnitOfWork = wipRoot;
}

/**
 * The state hook for function components. Allows components to have state.
 * @param initial The initial state value.
 * @returns A tuple containing the current state and a function to update it.
 */
function useState<T>(initial: T): [T, (action: SetStateAction<T>) => void] {
  const oldHook =
    wipFiber?.alternate?.hooks?.[hookIndex] as Hook<T> | undefined;

  const hook: Hook<T> = {
    state: oldHook ? oldHook.state : initial,
    queue: [],
  };

  const actions = oldHook ? oldHook.queue : [];
  actions.forEach(action => {
    hook.state = typeof action === "function" ? (action as (prevState: T) => T)(hook.state) : action;
  });

  const setState = (action: SetStateAction<T>): void => {
    // Check if the new state is different from the current state
    const newState = typeof action === "function" ? (action as (prevState: T) => T)(hook.state) : action;
    if (newState === hook.state) {
        return;
    }

    hook.queue.push(action as (prevState: T) => T | T);
    // Start a new render cycle
    if (currentRoot) {
      wipRoot = {
        dom: currentRoot.dom,
        props: currentRoot.props,
        alternate: currentRoot,
      };
      deletions = [];
      nextUnitOfWork = wipRoot;
    }
  };

  wipFiber?.hooks?.push(hook);
  hookIndex++;
  return [hook.state, setState];
}

// Export the public API
export const Jarvis = {
  createElement,
  render,
  useState,
};

// ============================================================================
// 4. RECONCILER (FIBER-BASED RENDERER)
// This is the heart of Jarvis. It uses a work loop to build the fiber tree
// incrementally without blocking the main thread.
// ============================================================================

/**
 * The main work loop. It processes fibers one by one until there's no more
 * work or the browser needs to yield.
 * @param deadline An object provided by requestIdleCallback with time remaining.
 */
function workLoop(deadline: IdleDeadline): void {
  let shouldYield = false;
  while (nextUnitOfWork && !shouldYield) {
    nextUnitOfWork = performUnitOfWork(nextUnitOfWork);
    shouldYield = deadline.timeRemaining() < 1;
  }

  // If the work loop is finished, commit the entire tree to the DOM.
  if (!nextUnitOfWork && wipRoot) {
    commitRoot();
  }

  requestIdleCallback(workLoop);
}

// Start the work loop.
requestIdleCallback(workLoop);

/**
 * Processes a single fiber, creating its children fibers and returning the
 * next fiber to be processed.
 * @param fiber The fiber to perform work on.
 * @returns The next unit of work.
 */
function performUnitOfWork(fiber: Fiber): Fiber | null {
  const isFunctionComponent = fiber.type instanceof Function;

  if (isFunctionComponent) {
    updateFunctionComponent(fiber);
  } else {
    updateHostComponent(fiber);
  }

  // Return the next fiber to process.
  if (fiber.child) {
    return fiber.child;
  }
  let nextFiber: Fiber | undefined = fiber;
  while (nextFiber) {
    if (nextFiber.sibling) {
      return nextFiber.sibling;
    }
    nextFiber = nextFiber.parent;
  }
  return null;
}

/**
 * Updates a function component: runs the function to get its children and
 * then reconciles them.
 * @param fiber The fiber for the function component.
 */
function updateFunctionComponent(fiber: Fiber): void {
  wipFiber = fiber;
  hookIndex = 0;
  wipFiber.hooks = [];

  const children = [fiber.type(fiber.props)];
  reconcileChildren(fiber, children);
}

/**
 * Updates a host component (a regular DOM element like 'div'): creates the DOM
 * node if it doesn't exist and reconciles its children.
 * @param fiber The fiber for the host component.
 */
function updateHostComponent(fiber: Fiber): void {
  if (!fiber.dom) {
    fiber.dom = createDom(fiber);
  }
  reconcileChildren(fiber, fiber.props.children);
}

/**
 * Compares the old fiber tree with the new elements and creates new fibers
 * for the changes.
 * @param wipFiber The work-in-progress fiber whose children to reconcile.
 * @param elements The new array of children elements.
 */
function reconcileChildren(wipFiber: Fiber, elements: JarvisElement[]): void {
  let index = 0;
  let oldFiber = wipFiber.alternate?.child;
  let prevSibling: Fiber | null = null;

  while (index < elements.length || oldFiber != null) {
    const element = elements[index];
    let newFiber: Fiber | null = null;

    const sameType =
      oldFiber &&
      element &&
      element.type === oldFiber.type;

    if (sameType) {
      // If the type is the same, it's an update.
      newFiber = {
        type: (oldFiber as Fiber).type,
        props: element.props,
        dom: (oldFiber as Fiber).dom,
        parent: wipFiber,
        alternate: (oldFiber as Fiber | null),
        effectTag: EffectTag.UPDATE,
      };
    }

    if (element && !sameType) {
      // If there's a new element and the type is different, it's a placement.
      newFiber = {
        type: element.type,
        props: element.props,
        dom: null,
        parent: wipFiber,
        alternate: null,
        effectTag: EffectTag.PLACEMENT,
      };
    }

    if (oldFiber && !sameType) {
      // If there's an old fiber and the type is different, it's a deletion.
      oldFiber.effectTag = EffectTag.DELETION;
      deletions.push(oldFiber);
    }

    if (oldFiber) {
      oldFiber = oldFiber.sibling;
    }

    if (index === 0) {
      wipFiber.child = newFiber;
    } else if (newFiber) {
      (prevSibling as Fiber).sibling = newFiber;
    }

    prevSibling = newFiber;
    index++;
  }
}

// ============================================================================
// 5. COMMIT PHASE
// This phase applies the changes calculated in the render phase to the DOM.
// ============================================================================

/**
 * Commits the entire fiber tree to the DOM.
 */
function commitRoot(): void {
  deletions.forEach(commitWork);
  if (wipRoot) {
    commitWork(wipRoot.child);
    currentRoot = wipRoot;
    wipRoot = null;
  }
}

/**
 * Recursively commits changes for a single fiber and its children/siblings.
 * @param fiber The fiber to commit.
 */
function commitWork(fiber?: Fiber | null): void {
  if (!fiber) {
    return;
  }

  let domParentFiber = fiber.parent;
  while (domParentFiber && !domParentFiber.dom) {
    domParentFiber = domParentFiber.parent;
  }
  const domParent = domParentFiber?.dom;

  if (fiber.effectTag === EffectTag.PLACEMENT && fiber.dom != null) {
    domParent?.appendChild(fiber.dom);
  } else if (fiber.effectTag === EffectTag.UPDATE && fiber.dom != null) {
    updateDom(fiber.dom, fiber.alternate!.props, fiber.props);
  } else if (fiber.effectTag === EffectTag.DELETION) {
    commitDeletion(fiber, domParent);
  }

  commitWork(fiber.child);
  commitWork(fiber.sibling);
}

/**
 * Handles the deletion of a fiber's DOM node.
 * @param fiber The fiber to delete.
 * @param domParent The parent DOM node to remove the child from.
 */
function commitDeletion(fiber: Fiber, domParent: Node | null | undefined): void {
    if (fiber.dom) {
        try {
            domParent?.removeChild(fiber.dom);
        } catch (error) {
            console.error("Failed to remove child during commitDeletion:", {
                error,
                domParent,
                child: fiber.dom,
            });
        }
    } else if (fiber.child) {
        // If the fiber has no DOM node, recurse to find the child that does.
        commitDeletion(fiber.child, domParent);
    }
}


// ============================================================================
// 6. DOM UTILITIES
// Helper functions for creating and updating DOM nodes.
// ============================================================================

/**
 * Creates a text element for string or number children.
 * @param text The text content.
 * @returns A Jarvis element for a text node.
 */
function createTextElement(text: string | number): JarvisElement {
  return {
    type: "TEXT_ELEMENT",
    props: { nodeValue: text, children: [] },
  };
}

/**
 * Creates a DOM node from a fiber.
 * @param fiber The fiber to create a DOM node for.
 * @returns The created DOM node.
 */
function createDom(fiber: Fiber): Node {
  const dom =
    fiber.type === "TEXT_ELEMENT"
      ? document.createTextNode("")
      : document.createElement(fiber.type as string);

  updateDom(dom, {}, fiber.props);
  return dom;
}

/**
 * Updates a DOM node with new props, handling event listeners and attributes.
 * @param dom The DOM node to update.
 * @param prevProps The previous props.
 * @param nextProps The new props.
 */
function updateDom(
  dom: Node,
  prevProps: { [key: string]: any },
  nextProps: { [key: string]: any }
): void {
  const isEvent = (key: string) => key.startsWith("on");
  const isProperty = (key: string) => key !== "children" && !isEvent(key);
  const isNew = (prev: any, next: any) => (key: string) => prev[key] !== next[key];
  const isGone = (next: any) => (key: string) => !(key in next);

  // Remove old or changed event listeners
  Object.keys(prevProps)
    .filter(isEvent)
    .filter(key => !(key in nextProps) || isNew(prevProps, nextProps)(key))
    .forEach(name => {
      const eventType = name.toLowerCase().substring(2);
      dom.removeEventListener(eventType, prevProps[name]);
    });

  // Remove old properties
  Object.keys(prevProps)
    .filter(isProperty)
    .filter(isGone(nextProps))
    .forEach(name => {
      (dom as any)[name] = "";
    });

  // Set new or changed properties
  Object.keys(nextProps)
    .filter(isProperty)
    .filter(isNew(prevProps, nextProps))
    .forEach(name => {
      (dom as any)[name] = nextProps[name];
    });

  // Add new event listeners
  Object.keys(nextProps)
    .filter(isEvent)
    .filter(isNew(prevProps, nextProps))
    .forEach(name => {
      const eventType = name.toLowerCase().substring(2);
      dom.addEventListener(eventType, nextProps[name]);
    });
}
