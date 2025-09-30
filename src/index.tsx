import { Jarvis } from "./jarvisLib/jarvisLib";

const el = <h1 title="foo">hello world!</h1>;
const container: HTMLElement | null = document.querySelector('#root');

const increase_count = (count: any, setCounter: any) => {
	setCounter(count + 1);
}

function App() {
	const  [count, setCounter] = Jarvis.useState(0);

	return (
		<div>
			<p title="increase">{count}</p>
			<button onClick= {() => {increase_count(count, setCounter)}}>increase me</button>
		</div>
	)
}

Jarvis.render(<App />, container);

