import { Jarvis } from './lib/jarvisLib';
import { ViewMap } from './Types';
import Logo from './assets/ping_pong_logo.png'
import Banner from './assets/landing_page_banner.png'

// Pages
export function Views( Data: any ): Element | null {
	const viewsMap: ViewMap = {
		'/': LandingPage,
		'/public/': LandingPage,
	};
	const { path, setPath } = Data;

	return viewsMap[path]?.(setPath);
}

function LandingPage( setPath: Function ): Element {
	return (
		<div>
			<img src= { Logo } alt="LOGO" />
			<img src={ Banner } alt="BANNER" />
			<h1>Ready to Play? it's your</h1>
			<span>Serve</span>
			<p>Track stats, connect with friends, and</p>
			<p>dominate the leaderboard</p>
			<button onClick = {() => { setPath('.') } }>Join Now</button>
			<button>Sign In</button>
		</div>
	)
}
