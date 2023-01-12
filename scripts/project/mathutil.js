export const TWO_PI = Math.PI * 2;

export const D_TO_R = Math.PI / 180;
export const R_TO_D = 180 / Math.PI;

export function angleTo(x1, y1, x2, y2)
{
	return Math.atan2(y2 - y1, x2 - x1);
}

export function angleClockwise(a1, a2)
{
	let s1 = Math.sin(a1);
	let c1 = Math.cos(a1);
	let s2 = Math.sin(a2);
	let c2 = Math.cos(a2);
	return c1 * s2 - s1 *c2 <= 0;
}

export function angleLerp(a, b, x, r=0)
{
	let diff=angleDiff(a,b);const revs=TWO_PI*r;if(angleClockwise(b,a))return clampAngle(a+(diff+revs)*x);else return clampAngle(a-(diff+revs)*x);
}

export function angleDiff(a1, a2)
{
	if(a1===a2)return 0;let s1=Math.sin(a1);let c1=Math.cos(a1);let s2=Math.sin(a2);let c2=Math.cos(a2);let n=s1*s2+c1*c2;if(n>=1)return 0;if(n<=-1)return Math.PI;return Math.acos(n);
}

export function angleRotate(start, end, step)
{
	let ss=Math.sin(start);let cs=Math.cos(start);let se=Math.sin(end);let ce=Math.cos(end);if(Math.acos(ss*se+cs*ce)>step)if(cs*se-ss*ce>0)return clampAngle(start+step);else return clampAngle(start-step);else return clampAngle(end);
}

/*export function anglerotate(start, end, step) //я не уверен, та же это функция, что сверху.
{
	// Rotate from angle 'start' towards angle 'end' by the angle 'step' (all in radians). (Повернуть от угла «начало» к углу «конец» на угол «шаг» (все в радианах).)
	const ss = Math.sin(start);
	const cs = Math.cos(start);
	const se = Math.sin(end);
	const ce = Math.cos(end);

	if (Math.acos(ss * se + cs * ce) > step)
	{
		if (cs * se - ss * ce > 0) return start + step;
		return start - step;
	}
	return end;
}*/

function clampAngle(a)
{
	a %= TWO_PI;
	if (a < 0) a += TWO_PI;
	return a;
}

export function distanceTo(x1, y1, x2, y2)
{
	return Math.hypot(x2 - x1, y2 - y1);
}

export function toDegrees(x)
{
	return x * R_TO_D;
}

export function toRadians(x)
{
	return x * D_TO_R;
}

function decimalAdjust(type, value, exp)
{
	//https://developer.mozilla.org/ru/docs/Web/JavaScript/Reference/Global_Objects/Math/round
	// Если степень не определена, либо равна нулю...
	if (typeof exp === 'undefined' || +exp === 0) return Math[type](value);
	value = +value;
	exp = +exp;
	// Если значение не является числом, либо степень не является целым числом...
	if (isNaN(value) || !(typeof exp === 'number' && exp % 1 === 0)) return NaN;
	// Сдвиг разрядов
	value = value.toString().split('e');
	value = Math[type](+(value[0] + 'e' + (value[1] ? (+value[1] - exp) : -exp)));
	// Обратный сдвиг
	value = value.toString().split('e');
	return +(value[0] + 'e' + (value[1] ? (+value[1] + exp) : exp));
}

//C3 functions. Math:

export function sin(x)
{
	return Math.sin(toRadians(x));
}

export function cos(x)
{
	return Math.cos(toRadians(x));
}

export function tan(x)
{
	return Math.tan(toRadians(x));
}

export function asin(x)
{
	return Math.asin(toRadians(x));
}

export function acos(x)
{
	return Math.acos(toRadians(x));
}

export function atan(x)
{
	return Math.atan(toRadians(x));
}

export function abs(x) //duplicate Math.abs.
{
	return Math.abs(x);
}

export function angle(x1, y1, x2, y2) //duplicate angleTo.
{
	return toDegrees(angleTo(x1, y1, x2, y2));
}

export function anglelerp(a, b, x, r=0)
{
	//angleLerp, but in degrees.
}

export function anglediff(a1, a2)
{
	//angleDiff, but in degrees.
}

export function anglerotate(start, end, step)
{
	//angleRotate, but in degrees.
}

export function ceil(x) //duplicate Math.ceil.
{
	return Math.ceil(x);
}

export function cosp(a, b, x)
{
	return (a + b + (a - b) * Math.cos(toRadians(x * 180))) / 2;
}

export function cubic(a, b, c, d, x)
{
	return lerp(qarp(a, b, c, x), qarp(b, c, d, x), x);
}

export function distance(x1, y1, x2, y2) //duplicate distanceTo.
{
	return distanceTo(x1, y1, x2, y2);
}

export function exp(x) //duplicate Math.exp.
{
	return Math.exp(x);
}

export function floor(x) //duplicate Math.floor.
{
	return Math.floor(x);
}

export const infinity = Infinity; //duplicate Infinity.

export function lerp(a, b, x)
{
	return a + x*(b - a);
}

export function unlerp(a, b, x)
{
	if (a === b) return 0;
	return (x - a) / (b - a);
}

export function ln(x) //duplicate Math.ln.
{
	return Math.log(x);
}

export function log10(x)
{
	return Math.log(x) / Math.log(10);
}

export function max(...args) //duplicate Math.max.
{
	return Math.max(...args);
}

export const pi = Math.PI; //duplicate Math.PI.

export function qarp(a, b, c, x)
{
	return lerp(lerp(a, b, x), lerp(b, c, x), x);
}

export function round(x) // duplicate Math.round.
{
	return Math.round(x);
}

export function roundToDp(value, exp)
{
	return decimalAdjust('round', value, exp);
}

export function sign(x)
{
	//return x / Math.abs(x);
	
	if (x < 0) return -1;
	if (x > 0) return 1;
	return 0;
}

export function sqrt(x) //duplicate Math.sqrt.
{
	return Math.sqrt(x);
}

export function getbit(x, n)
{
	
}

export function setbit(x, n, b)
{
	
}

export function togglebit(x, n)
{
	
}

//C3 functions. Values:

export function choose(...args)
{
	const index = Math.floor(Math.random() * args.length);
	return args[index];
}

export function clamp(x, a, b)
{
	//return Math.min(Math.max(x, a), b);
	
	if (x < a) return a;
	if (x > b) return b;
	return x;
}

export function float(x)
{
	
}

export function int(x)
{
	
}

export function random(a, b=0)
{
	//[a, b)
	if (b === 0) return Math.random() * a;
	return (Math.random() * (b - a)) + a;
}

export function rgbEx(r, g, b)
{
	
}

export function rgbEx255(r, g, b)
{
	
}

export function rgba(r, g, b, a)
{
	
}

export function rgba255(r, g, b, a)
{
	
}

export function str(x)
{
	
}

export function is_outside_layout(inst)
{
	const layout = inst.layout;
	return inst.x < 0 || inst.y < 0 || inst.x > layout.width || inst.y > layout.height;
}

function is_outside_screen(inst)
{
	//я не уверен, что именно так.
	const viewport = inst.layer.getViewport();
	return inst.x < viewport.left || inst.y < viewport.top || inst.x > viewport.right || inst.y > viewport.bottom;
}

//Classic functions. Math:

function linearAim(bulletX, bulletY, bulletSpeed, targetX, targetY, targetSpeed, targetAngle)
{
	
}

function normalRandom(mean, sigma)
{
	//Normal distribution random.
}