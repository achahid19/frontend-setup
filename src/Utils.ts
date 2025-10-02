// Utilities
function getCurrentPath(): string {
	return window.location.pathname; // compiler inference, assign string value lead to string type of path.
}

export const Utils = {
    getCurrentPath,
}
