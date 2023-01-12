/*
runtime.random() [0; 1) Return a random number in the range [0, 1). This is similar to Math.random(), but can produce a deterministic sequence of values if the Advanced Random object overrides the system random.
Math.random() [0; 1)

Math.PI

Math.abs(x)
Math.exp(x)
Math.log(x) - натуральный логарифм числа
Math.sign(x)
Math.pow(x, y) (или a ** b)
Math.sqrt(x)

Math.sin(x)
Math.cos(x)
Math.tan(x)
Math.asin(x)
Math.acos(x)
Math.atan(x)
Math.atan2(y, x)

Math.hypot(x, y)

Math.round(x) Math.round(-1.2)	// -1
Math.floor(x) Math.floor(-1.2)	// -2
Math.ceil(x)  Math.ceil(-1.2)	// -1

Math.min(x, y, ...)
Math.max(x, y, ...)
Math.max() //-Infinity

Math.exp(x)
*/

import {clamp} from "./mathutil.js";

export function lerp_dt(a, b, t, dt)
{
	const nt = 1 - Math.pow(t, dt);
	return a + (nt * (b - a));
}

export function getRandInt(min, max) //get_random_integer.
{
	//[min; max]
	return Math.floor(Math.random() * (max - min + 1)) + min;
}

export function springing(velocity, a, b, dampening_ratio, speed)
{
	//dampening_ratio set between ( 0 - 1 ) || 0 = acts similar to lerp || 1 = will keep bounce back and forth forever
	
	//Apply Dampening
	let result_velocity = velocity * dampening_ratio;
	
	//Set Velocity
	result_velocity += (b - a) * speed;
	
	return result_velocity;
}

export function px_2_pt(px)
{
	//from pixels to points
	return px * 0.75;
}

// @deprecated (no deprecated)
export async function fetching_file(fileName, runtime, b_json=true)
{
	/*
	на сервере runtime.assets.getProjectFileUrl() === fileName если файл существует или нет. а в констракте если файла нет, то runtime.assets.getProjectFileUrl() === fileName, а если есть, то runtime.assets.getProjectFileUrl() возвращает ссылку на этот файл.
	*/
	const textFileUrl = await runtime.assets.getProjectFileUrl(fileName);
	let response = null;
	let b_fail = false;
	
	try
	{
		response = await fetch(textFileUrl);
	}
	catch
	{
		b_fail = true;
	}
	
	if (b_fail)
	{
		return null;
	}
	
	let fetched = null;
	if (b_json)
	{
		fetched = await response.json();
	}
	else
	{
		fetched = await response.text();
	}
	
	return fetched;
}

export async function fetching_file_new(fileName, runtime, b_json=true) //no work.
{
	if (b_json)
	{
		return await runtime.assets.fetchJson(fileName);
	}
	else
	{
		return await runtime.assets.fetchText(fileName);
	}
}

export async function promise(fileName, runtime, delay=0, b_json=true)
{
	const string = await fetching_file(fileName, runtime, b_json);
	
	const myFirstPromise = new Promise((resolve, reject) => { //и reject тут можно не принимать.
		setTimeout(() => {resolve(string);}, delay);
	});
	
	return await myFirstPromise; //странно, но тут и без await и async в начале функции работает. и можно promise не выносить в отдельную переменную.
}

export function cssPxToLayer(e, layer, runtime) //надо бы её переписать и не использовать е (хотя мне так больше нравится, надо оставить всё как есть). надо добавить ещё функцию layerToCssPx.
{
	return runtime.layout.getLayer(layer).cssPxToLayer(e.clientX, e.clientY);
}

export function layerToLayer(layer1, layer2, x, y, runtime)
{
	const [cssX, cssY] = runtime.layout.getLayer(layer1).layerToCssPx(x, y);
	return runtime.layout.getLayer(layer2).cssPxToLayer(cssX, cssY);
}

export function load_images(instances, runtime, b_destroy=true)
{
	for (let i = instances.length - 1; i >= 0; i--)
	{
		const o = instances[i];
		const object = runtime.objects[o];
		
		if (object === undefined)
		{
			console.warn(`${o} is ${object}`);
			continue;
		}
		
		const instance = object.getFirstInstance();
		
		if (instance === null)
		{
			runtime.callFunction("Load_Images", o);
			continue;
		}
		
		if (!b_destroy) continue;
		
		instance.destroy();
	}
}

export function shuffle(list)
{
	//Тасование Фишера — Йетса
	for (let i = list.length - 1; i > 0; i--)
	{
		const j = getRandInt(0, i);
		[list[i], list[j]] = [list[j], list[i]];
	}
	
	return list;
}

export function get_shuffle_array(count)
{
	const list = [];
	
	for (let i = 0; i < count; i++)
	{
		list.push(i); //insert index at floor(random(length + 1)) вместо перемешивания.
	}
	
	return shuffle(list);
}

export function get_value_object(object, key, defaultKey)
{
	/*
	вот такой вариант еще предложил Михаил Кобычёв.
	let a = {
		var1: "asd",
		getVar1: function() { return this.var1 === undefined ? "default" : this.var1 }
	}
	*/
	if (key in object)
	{
		return object[key];
	}
	
	return object[defaultKey];
}

export function get_query_params()
{
	const paramsString = window.location.search;
	const searchParams = new URLSearchParams(paramsString);
	return searchParams;
	
	/*const lol = new URLSearchParams(window.location.search);
	const kek = Object.fromEntries(lol);
	console.log(Object.entries(kek));*/
}

async function request_time_out(url, headers, data)
{
	function fetch_time_out(url, options, timeout = 60000) //вот эта функция делает запрос с тайм-аутом (но я хз как это работает).
	{
		return Promise.race([fetch(url, options),
		new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), timeout))]);
	}
	
	const OPTIONS = {};
	OPTIONS.method = "POST";
	OPTIONS.headers = {"Content-Type": "application/json"};
	
	Object.assign(OPTIONS.headers, headers);
	OPTIONS.body = JSON.stringify(data);
	
	return await fetch_time_out(url, OPTIONS)
	.then((result) => {
		return result
	})
	.catch((e) => {
		return "time out"});
}

export async function request(url, headers, data, b_returned = true)
{
	const response = await request_time_out(url, headers, data);
	if (response["ok"] === true)
	{
		if (b_returned)
		{
			return await response.json();
		}
		else
		{
			return {};
		}
	}
	else
	{
		let result = {"status":"failed"};
		try
		{
			const j = await response.json();
			result = j;
		}
		catch
		{
			console.log('Невозможно прочитать тело запроса.');
		}
		
		return result;
	}
}

export function copy_to_buffer(text)
{
	navigator.clipboard.writeText(text).then(() => {console.log(`copy to buffer:\n${text}`);}).catch(err => {console.log('Something went wrong copy to buffer:\n${text}', err);});
}

export function fade(inTime, waitTime, outTime, currentTime, gameTime)
{
	const end = inTime + waitTime + outTime;
	const t = gameTime - currentTime;
	
	if (t > end)
	{
		return -1;
	}
	
	return clamp(Math.min(t / inTime, (t - end) / (-outTime)), 0, 1);
}

export function isometricToCartesian(x, y)
{
	const cartX = ((2 * y) + x) / 2;
	const cartY = ((2 * y) - x) / 2;
	return [cartX, cartY];
}

export function cartesianToIsometric(x, y)
{
	const isoX = x - y;
	const isoY = (x + y) / 2;
	return [isoX, isoY];
}

export function get_position_icon_text(buttonSize, iconSize, offset, textPosition, textSize_, textTextSize) //предпоследний параметр не нужен.
{
	//0 - textSize, 1 - iconPosition.
	const textSize = buttonSize - iconSize - offset;
	return [textSize, textPosition + (textSize / 2) + (textTextSize / 2) + offset];
}

export function object_is_empty(object) //@deprecated.
{
	return JSON.stringify(object) === "{}";
}

export function is_object_empty(object)
{
	return JSON.stringify(object) === "{}";
}

export function is_objects_equal(object1, object2)
{
	return JSON.stringify(object1) === JSON.stringify(object2);
}

export function is_arrays_equal(array1, array2)
{
	if (array1.length !== array2.length) return false;
	
	for (let i = array1.length - 1; i >= 0; i--)
	{
		if (array1[i] !== array2[i]) return false;
	}
	
	return true;
}

export function is_between_values(val, lowerBound, upperBound)
{
	return (val >= lowerBound) && (val <= upperBound);
}

/*export function create_SVGS(instances, runtime, SVG, layer)
{
	//надо чтобы он создавался строго на экране. значит надо растягивать еще задник, чтобы их не было видно.
	for (const instance of instances)
	{
		const svg = SVG.createInstance(layer, 0, 0);
		svg.instVars.file = `${instance}.svg`;
	}
}

export function infinity_SVGS(instances, runtime)
{
	for (const o of instances)
	{
		const object = runtime.objects[o];
		if (object != undefined) //проверка на существование объекта
		{
			const instance = object.getFirstInstance();
			if (instance != null) //проверка на наличие экземпляра
			{
				instance.x = -10000;
			}
		}
		else
		{
			console.log(`${o} is undefined`);
		}
	}
}*/

export function isPrime(n)
{
	// 1 is not a prime number
	if (n === 1)
		return false;

	// Raise to power of 1/2 takes square root
	let sqrtN = n ** 0.5;

	// Check for factors from 2 to square root of n
	for (let f = 2; f <= sqrtN; f++)
	{
		if (n % f === 0)
		{
			// Found a factor: not a prime
			return false;
		}
	}

	// Did not find any factors: is a prime
	return true;
}

export function factorialRecursion(n)
{
	if (n === 1)
	{
		return 1;
	}
	else
	{
		// Recursion happens here
		return n * factorialRecursion(n - 1);
	}
}

export function factorialFor(n)
{
	let product = 1;

	for ( ; n > 1; n--)
	{
		product *= n;
	}

	return product;
}

export function remove_instance_from_array(instance, arr)
{
	for (let i = 0; i < arr.length; i++)
	{
		if (arr[i] === instance)
		{
			arr.splice(i, 1);
			return;
		}
	}
}

export function get_scale(screenSize, contentSize, mode)
{
	const width = screenSize[0] / contentSize[0];
	const height = screenSize[1] / contentSize[1];
	
	switch (mode)
	{
		case "inner": return Math.max(width, height); break;
		case "outer": return Math.min(width, height); break;
	}
}

export function sprite_set_animation(sprite, name, defaultName)
{
	try
	{
		sprite.setAnimation(name);
	}
	catch (e)
	{
		if (e instanceof Error) sprite.setAnimation(defaultName);
	}
}

export function print_unloaded_objects(objectNames, objects, exceptionNamesExtra=[])
{
	const exceptionNames = [
		"Audio",
		"Browser",
		"Keyboard",
		"Touch",
		"PlatformInfo",
		"Mouse",
	];
	
	exceptionNames.push(...exceptionNamesExtra);
	
	Object.values(objects).forEach(object => {
		const name = object.name;
		
		if (exceptionNames.includes(name)) return;
		
		if (!objectNames.includes(name)) console.warn(`Object unloaded:`, name);
	});
}

export async function print_version(runtime)
{
	const offline = await runtime.assets.fetchJson("offline.json");
	console.log('version', offline.version);
}

export function is_object_in_array(object, arr)
{
	for (let i = arr.length - 1; i >= 0; i--)
	{
		const current = arr[i];
		
		if (current === object) return true;
	}
	
	return false;
}

export function get_basis_vectors(alpha, beta, gamma)
{
	const sa = Math.sin(alpha);
	const ca = Math.cos(alpha);
	const sb = Math.sin(beta);
	const cb = Math.cos(beta);
	const sc = Math.sin(gamma);
	const cc = Math.cos(gamma);
	
	const absX = (cc * ca) - (sc * sb * sa);
	const absY = sc * cb * -1;
	const absZ = (cc * sa) + (sc * sb * ca);
	
	const ordX = (sc * ca) + (cc * sb * sa);
	const ordY = cc * cb;
	const ordZ = (sc * sa) - (cc * sb * ca);
	
	const appX = cb * sa * -1;
	const appY = sb;
	const appZ = cb * ca;
	
	return [[absX, absY, absZ], [ordX, ordY, ordZ], [appX, appY, appZ]];
}

export function get_rotate_point(x, y, angle, hotspotX=0, hotspotY=0)
{
	const deltaX = x - hotspotX;
	const deltaY = y - hotspotY;
	
	const resultX = ((Math.cos(angle) * deltaX) - (Math.sin(angle) * deltaY)) + hotspotX;
	const resultY = ((Math.sin(angle) * deltaX) + (Math.cos(angle) * deltaY)) + hotspotY;
	
	return [resultX, resultY];
}

export function dispatch_event(name, detail=null)
{
	globalThis.dispatchEvent(new CustomEvent(name, {detail}));
}

export function event_promise(name, object, callback=() => true)
{
	return new Promise(resolve => {
		function check_end(e)
		{
			if (!callback(e)) return;
			
			object.removeEventListener(name, check_end);
			resolve(e);
		}
		
		object.addEventListener(name, check_end);
	});
}

export function promise_promise(name, object, otherPromise, callback=() => true)
{
	return new Promise(async resolve => {
		object.addEventListener(name, callback);
		await otherPromise;
		object.removeEventListener(name, callback);
		resolve();
	});
}