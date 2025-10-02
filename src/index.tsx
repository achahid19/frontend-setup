import { Jarvis } from "./lib/jarvisLib";
import { Views } from "./Views";
import { Utils } from './Utils';

// container where to render the App
const container = document.getElementById('root');

// App
function App(): Element {
	const [path, setPath] = Jarvis.useState(Utils.getCurrentPath());
	const dataObj: Object = {
		path,
		setPath,
	}

	return (
		<div>
			{ Views(dataObj) }
		</div>
	)
}

// Rendering
Jarvis.render(<App />, container);
