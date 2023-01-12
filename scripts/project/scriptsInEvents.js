


const scriptsInEvents = {

	async EventSheet1_Event9(runtime, localVars)
	{
		globalThis.dispatchEvent(new CustomEvent("restart"));
	},

	async EventSheet1_Event13(runtime, localVars)
	{
		globalThis.dispatchEvent(new CustomEvent("get score"));
	},

	async EventSheet1_Event15(runtime, localVars)
	{
		globalThis.dispatchEvent(new CustomEvent("products"));
	},

	async Polyfill_Event5(runtime, localVars)
	{
		globalThis.dispatchEvent(new CustomEvent("image loading complete"));
	},

	async Polyfill_Event18(runtime, localVars)
	{
		globalThis.dispatchEvent(new CustomEvent("tap gesture", {detail: {x: localVars.x_, y: localVars.y_}}));
	},

	async Polyfill_Event21(runtime, localVars)
	{
		globalThis.dispatchEvent(new CustomEvent("tap gesture", {detail: {x: localVars.x_, y: localVars.y_}}));
	},

	async Polyfill_Event24(runtime, localVars)
	{
		localVars.b_debug = globalThis.b_debug ? 1 : 0;
	}

};

self.C3.ScriptsInEvents = scriptsInEvents;

