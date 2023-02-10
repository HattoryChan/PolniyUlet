console.info('Last edits Thu Feb  9 12:57:31 2023');

class Bee
{
	constructor(runtime, options, common)
	{
		Bee.instances.push(this);
		
		this.runtime = runtime;
		this.common = common;
		
		const {x, y, size, speed, smooth, wingsSpeed, wingsOffset, layer="bee"} = options;
		
		this.startSpeed = speed;
		if ((layer !== "hud") && this.common.game.is_there_modifier_on_level("bee speed")) this.startSpeed *= this.common.config["modifiers bee"]["speed"];
		this.speedLerp = this.startSpeed;
		this.speed = this.startSpeed;
		this.smooth = smooth;
		this.x = x;
		this.y = y;
		this.flowerBeeAngle = 0;
		this.moveAngle = Math.PI * 1.5;
		this.state = "";
		this.flower = null;
		this.flowers = [];
		this.direction = 1;
		this.wings = [];
		this.wingsSpeed = wingsSpeed;
		this.wingsOffset = wingsOffset;
		
		this.hive = null;
		this.hiveRadius = null;
		
		this._create_sprite({x, y, size, layer});
		this._create_wings({size});
		
		this.radius = (this.sprite.height / 2) * this.common.config["bee"]["collision radius"];
		
		this.jumpX = this.x;
		this.jumpY = this.y;
		
		this.b_resetFlowers = false;
		
		this.lastFlower = null;
		this.lastFlowers = [];
		
		this.collisionMask = null;
		this._create_collision_mask();
	}
	
	destroy()
	{
		this.sprite.destroy();
		this.wings.forEach(wing => wing.destroy());
		if (this.collisionMask !== null) this.collisionMask.destroy();
	}
	
	tick()
	{
		switch (this.state)
		{
			case "rotate": this._rotate(); break;
			case "jump": this._jump(); break;
			case "rotate infinity": this._rotate_infinity(); break;
			case "hive": this._rotate_hive(); break;
		}
		
		this._set_speed_lerp();
		
		this._set_sprite_position();
		
		this._check_reset_flowers();
		
		this._set_collision_mask_position();
	}
	
	set_state(state)
	{
		this.state = state;
		
		switch (state)
		{
			case "jump":
			{
				this.jumpX = this.x;
				this.jumpY = this.y;
				
				break;
			}
			
			case "hive":
			{
				this.flowerBeeAngle = this._get_angle_hive_bee(this.hive);
				
				break;
			}
			
			case "invisible":
			{
				this.sprite.isVisible = false;
				this.wings.forEach(wing => wing.isVisible = false);
				
				break;
			}
		}
	}
	
	set_flower(flower)
	{
		this.flower = flower;
		this.flowerBeeAngle = this._get_angle_flower_bee(flower);
		
		this.flowers.length = 0;
		
		this.lastFlower = flower;
		this.lastFlowers.length = 0;
	}
	
	set_flowers(firstFlower, secondFlower)
	{
		this.flowers = [firstFlower, secondFlower];
		const angle = this._get_angle_flower_bee(firstFlower) - firstFlower.addAngle + (firstFlower.inclineAngle * -this.direction);
		this.flowerBeeAngle = angle < 0 ? angle + Mathutil.TWO_PI : angle;
		
		this.flower = null;
		
		this.lastFlowers = [firstFlower, secondFlower];
		this.lastFlower = null;
	}
	
	set_angle(angle)
	{
		this.moveAngle = angle;
	}
	
	reset_speed()
	{
		this.speedLerp = this.startSpeed;
	}
	
	get _speedWithDT()
	{
		return this.speed * this.runtime.dt;
	}
	
	_get_angle_flower_bee(flower)
	{
		const flowerSprite = flower.sprite;
		return Mathutil.angleTo(flowerSprite.x, flowerSprite.y, this.x, this.y) * this.direction;
	}
	
	_get_angle_hive_bee(hive)
	{
		return Mathutil.angleTo(hive.x, hive.y, this.x, this.y) * this.direction;
	}
	
	_rotate()
	{
		const flower = this.flower;
		const flowerSprite = flower.sprite;
		const radius = flower.radius;
		const flowerBeeAngle = this.flowerBeeAngle;
		
		const angle = flowerBeeAngle * this.direction;
		this.x = flowerSprite.x + (Math.cos(angle) * radius);
		this.y = flowerSprite.y + (Math.sin(angle) * radius);
		
		switch (flowerSprite.animationName)
		{
			case "default": this._add_angle(radius); break;
			case "accelerating":
			{
				const oldPosition = this._get_cos_angle(this.flowerBeeAngle);
				this._add_angle(radius);
				const newPosition = this._get_cos_angle(this.flowerBeeAngle);
				
				if (this.direction === 1)
				{
					if ((oldPosition === 1) && (newPosition === -1)) this._add_speed();
				}
				else
				{
					if ((oldPosition === -1) && (newPosition === 1)) this._add_speed();
				}
				
				break;
			}
			
			case "vanishing":
			{
				const oldPosition = this._get_cos_angle(this.flowerBeeAngle);
				this._add_angle(radius);
				const newPosition = this._get_cos_angle(this.flowerBeeAngle);
				
				if (this.direction === 1)
				{
					if ((oldPosition === 1) && (newPosition === -1))
					{
						flower.vanishingCount++;
					}
				}
				else
				{
					if ((oldPosition === -1) && (newPosition === 1))
					{
						flower.vanishingCount++;
					}
				}
				
				break;
			}
		}
		
		this.moveAngle = Mathutil.angleTo(flowerSprite.x, flowerSprite.y, this.x, this.y) + ((Math.PI / 2) * this.direction);
	}
	
	_add_angle(radius)
	{
		this.flowerBeeAngle += this._speedWithDT / radius;
	}
	
	_add_speed()
	{
		this.speedLerp *= this.common.config["bee"]["add speed"];
	}
	
	_get_cos_angle(angle)
	{
		return Math.round(Math.cos(Math.round(angle / Math.PI) * Math.PI));
	}
	
	_set_speed_lerp()
	{
		this.speed = Utils.lerp_dt(this.speed, this.speedLerp, 0.0001, this.runtime.dt);
	}
	
	_jump()
	{
		const speed = this._speedWithDT;
		const moveAngle = this.moveAngle;
		
		this.x += Math.cos(moveAngle) * speed;
		this.y += Math.sin(moveAngle) * speed;
	}
	
	_rotate_infinity()
	{
		//@duplicate #2.
		const flowerBeeAngle = this.flowerBeeAngle;
		const numberFlower = Math.floor(flowerBeeAngle / Mathutil.TWO_PI) % 2;
		const flower = this.flowers[numberFlower];
		
		let infinityDirection;
		let addAngle;
		
		if (this.flowers[0].addAngle === 0)
		{
			addAngle = flower.addAngle;
			infinityDirection = addAngle === 0 ? 1 : -1;
		}
		else
		{
			addAngle = numberFlower === 0 ? Math.PI : 0;
			infinityDirection = numberFlower === 0 ? 1 : -1;
		}
		if (flower === undefined)
		{
			console.warn(this.flowers);
			debugger;
			//может это происходит когда я сверху на цветок упаду?
			return;
		}
		const flowerSprite = flower.sprite;
		const angle = ((flowerBeeAngle * this.direction) * infinityDirection) + addAngle + flower.inclineAngle;
		const radius = flower.radius;
		this.x = flowerSprite.x + (Math.cos(angle) * radius);
		this.y = flowerSprite.y + (Math.sin(angle) * radius);
		
		this.flowerBeeAngle += this._speedWithDT / radius;
		
		this.moveAngle = Mathutil.angleTo(flowerSprite.x, flowerSprite.y, this.x, this.y) + (Math.PI / 2 * this.direction * infinityDirection);
	}
	
	get_angle_and_direction_infinity() //@duplicate #2.
	{
		const flowerBeeAngle = this.flowerBeeAngle;
		const numberFlower = Math.floor(flowerBeeAngle / Mathutil.TWO_PI) % 2;
		let infinityDirection;
		let addAngle;
		const flower = this.flowers[numberFlower];
		
		if (this.flowers[0].addAngle === 0)
		{
			addAngle = flower.addAngle;
			infinityDirection = addAngle === 0 ? 1 : -1;
		}
		else
		{
			addAngle = numberFlower === 0 ? Math.PI : 0;
			infinityDirection = numberFlower === 0 ? 1 : -1;
		}
		
		return infinityDirection;
	}
	
	_rotate_hive()
	{
		const hive = this.hive;
		const radius = this.hiveRadius;
		const flowerBeeAngle = this.flowerBeeAngle;
		
		const angle = flowerBeeAngle * this.direction;
		this.x = hive.x + (Math.cos(angle) * radius);
		this.y = hive.y + (Math.sin(angle) * radius);
		
		this.flowerBeeAngle += this._speedWithDT / radius;
		
		this.moveAngle = Mathutil.angleTo(hive.x, hive.y, this.x, this.y) + ((Math.PI / 2) * this.direction);
		
		this.hiveRadius -= this.common.config["hive"]["bee speed"] * this.runtime.dt;
		
		if (this.hiveRadius <= 10)
		{
			const scale = 0.75;
			hive.width *= scale;
			hive.height *= scale;
			
			this.common.game.score += 50;
			
			this.set_state("invisible");
			
			setTimeout(() => this.common.hud.win(), 500); //просто визуальная задержка.
		}
	}
	
	_set_sprite_position()
	{
		const sprite = this.sprite;
		const smooth = this.smooth;
		
		if (smooth === 0)
		{
			sprite.x = this.x;
			sprite.y = this.y;
			sprite.angle = this.moveAngle;
			return;
		}
		
		const dt = this.runtime.dt;
		sprite.x = Utils.lerp_dt(sprite.x, this.x, smooth, dt);
		sprite.y = Utils.lerp_dt(sprite.y, this.y, smooth, dt);
		//sprite.angleDegrees = this.runtime.callFunction("Angle_Lerp", sprite.angleDegrees, Mathutil.toDegrees(this.moveAngle), 1 - Math.pow(smooth, dt));
		sprite.angle = Mathutil.angleLerp(sprite.angle, this.moveAngle, 1 - Math.pow(smooth, dt));
	}
	
	_create_sprite(options)
	{
		const {x, y, size, layer} = options;
		
		const sprite = this.runtime.objects.Sprite_Bee.createInstance(layer, x, y);
		this.sprite = sprite;
		sprite.width *= size;
		sprite.height *= size;
		sprite.angle = Math.PI * 1.5;
	}
	
	_create_wings(options)
	{
		const {size} = options;
		
		const coords = [
			{x: -44, y: 32, a: 10},
			{x: -44, y: -32, a: 350}
		];
		
		const boxWithTick = new BoxWithTick();
		const sprite = this.sprite;
		
		coords.forEach((coord, index) => {
			const wing = this.runtime.objects.Sprite_Wing.createInstance(sprite.layer.name, coord.x * size, coord.y * size);
			wing.angleDegrees = coord.a;
			wing.startAngleDegrees = wing.angleDegrees;
			wing.animationFrame = index;
			wing.startX = wing.x;
			wing.startY = wing.y;
			wing.width *= size;
			wing.height *= size;
			this.wings.push(wing);
			wing.set_position = () => {
				const angle = sprite.angle;
				const angleDegrees = sprite.angleDegrees;
				
				const time = (Math.sin(this.runtime.gameTime * this.wingsSpeed) + 1) / 2;
				
				wing.x = (wing.startX * Math.cos(angle) - (wing.startY * Math.sin(angle))) + sprite.x;
				wing.y = ((wing.startX * Math.sin(angle)) + wing.startY * Math.cos(angle)) + sprite.y;
				
				const moveAngleDegrees = Mathutil.lerp(wing.startAngleDegrees, wing.startAngleDegrees + (this.wingsOffset * (wing.animationFrame === 0 ? -1 : 1)), time);
				wing.angleDegrees = moveAngleDegrees + angleDegrees;
			};
			boxWithTick.append(wing, () => {
				if (!["load_SDK", "main"].includes(this.common.hud.level) && this.common.game.b_pause) return;
				
				wing.set_position();
			});
			wing.set_position();
		});
	}
	
	_check_reset_flowers()
	{
		if (!this.b_resetFlowers) return;
		
		if (this.common.game.is_bee_overlapping_with_flower()) return;
		
		this.flower = null;
		this.flowers.length = 0;
		
		this.b_resetFlowers = false;
	}
	
	_create_collision_mask()
	{
		if (!this.common.config["b_debug"]) return;
		
		const collisionMask = this.runtime.objects.Sprite_Collision_Mask.createInstance("bee", 0, 0);
		this.collisionMask = collisionMask;
		collisionMask.width = this.radius * 2;
		collisionMask.height = collisionMask.width;
		collisionMask.colorRgb = [1, 1, 0];
		
		//@task. сюда бы boxWithTick.
	}
	
	_set_collision_mask_position()
	{
		if (this.collisionMask === null) return;
		
		const collisionMask = this.collisionMask;
		//const sprite = this.sprite;
		
		collisionMask.x = this.x;
		collisionMask.y = this.y;
	}
}

import * as Utils from "./utilities.js";
import BoxWithTick from "./box_with_tick.js";
import {LoadScript} from "./script_load.js";
import crc32 from "./crc32.js";
import * as Mathutil from "./mathutil.js";
//import debug from "./debug.js";

runOnStartup(async runtime =>
{
	runtime.addEventListener("beforeprojectstart", () => {
		new Common(runtime);
	});
});

class Common
{
	constructor(runtime)
	{
		this.runtime = runtime;
		
		this.b_accessDenied = false;
		
		this._common();
	}
	
	async _common()
	{
		const runtime = this.runtime;
		
		//Utils.print_version(runtime);
		Utils.print_metadata(runtime);
		
		this.config = await runtime.assets.fetchJson("files/config.json");
		const b_debug = this.config["b_debug"];
		globalThis.b_debug = b_debug; //@debug.
		if (b_debug) console.log(`%cDEBUG MODE`, `background-color: #e004bf;`);
		
		this._add_listeners_instance_create();
		
		this.loader = new Loader(runtime);
		
		this.gameScore = new GameScore(this, this.runtime.assets, this.config);
		
		this.hud = new Hud(runtime, this);
		
		this.game = new Game(runtime, this);
		
		this.gameScore.init();
	}
	
	check_protection(checkString)
	{
		const hashes = this.config["hashes"];
		hashes.length = 2;
		
		const check = crc32(checkString);
		
		//вот эта работает, отключил временно.
		//if (!hashes.includes(check)) return 1;
		
		//if (globalThis.top.location.href !== globalThis.location.href) return 2;
		
		//странно, в document.referrer пусто, но вроде было не пусто...
		//console.log('lol', globalThis.top.location.href, document.referrer);
		//if ((document.domain !== "preview.construct.net") && (globalThis.top.location.href !== document.referrer)) return 3;
		
		return 0;
	}
	
	_add_listeners_instance_create()
	{
		const runtime = this.runtime;
		
		runtime.objects.Text_HUD.addEventListener("instancecreate", e => {
			const instance = e.instance;
			
			instance.fontFace = "comic";
			instance.sizePt = this.config["hud"]["text size pt"];
			instance.fontColor = [1, 1, 1];
		});
		
		runtime.objects.Sprite_Collision_Mask.addEventListener("instancecreate", e => {
			const mask = e.instance;
			
			mask.opacity = 0.25;
			mask.blendMode = "additive";
		});
		
		runtime.objects.Sprite_Button.addEventListener("instancecreate", e => {
			const button = e.instance;
			
			button.brightness = button.effects[0];
			button.brightness.isActive = false;
		});
	}
}

class Flower
{
	constructor(runtime, common, options, nectarOptions)
	{
		Flower.instances.push(this);
		
		this.runtime = runtime;
		this.common = common;
		
		const {x, y, radius, type, addAngle, inclineAngle, middleY} = options;
		
		const animationFrames = {
			"": [0, 5],
			"infinity": [4, 5],
		};
		const [animationFrameMin, animationFrameMax] = animationFrames[type];
		
		const sprite = this.runtime.objects.Sprite_Flower.createInstance("middleground", x, y);
		this.sprite = sprite;
		sprite.animationFrame = Utils.getRandInt(animationFrameMin, animationFrameMax);
		sprite.width = radius * 2;
		sprite.height *= (sprite.width / sprite.imageWidth);
		sprite.angle = Math.random() * Mathutil.TWO_PI;
		
		this.radius = radius;
		this.type = type;
		this.twinFlower = null;
		this.addAngle = addAngle;
		this.inclineAngle = inclineAngle;
		this.middleY = middleY;
		this.nectarOptions = nectarOptions;
		this.nectars = [];
		this.thirdIndex = null;
		this.index = 0;
		this.indexInArray = 0;
		
		this.vanishingFlowers = [];
		this.vanishingCount = 0;
		this.b_vanishingJump = false;
		
		this.collisionMask = null;
		this._create_collision_mask();
	}
	
	static init()
	{
		this.instances = [];
	}
	
	static tick()
	{
		const instances = this.instances;
		for (let i = 0; i < instances.length; i++)
		{
			const instance = instances[i];
			
			//instance._tick();
		}
	}
	
	static destroy_all()
	{
		this.instances.forEach(instance => {
			instance._destroy();
		});
		this.instances.length = 0;
	}
	
	tick()
	{
		this._set_vanishing_flower();
		
		this._check_vanishing_jump();
		
		this._set_collision_mask_position();
	}
	
	set_twin_flower(flower)
	{
		this.twinFlower = flower;
	}
	
	set_x(x)
	{
		const sprite = this.sprite;
		
		const nectars = this.nectars;
		for (let i = nectars.length - 1; i >= 0; i--)
		{
			const nectar = nectars[i];
			nectar.x += x - sprite.x;
		}
		
		const vanishingFlowers = this.vanishingFlowers;
		for (let i = vanishingFlowers.length - 1; i >= 0; i--)
		{
			const vanishingFlower = vanishingFlowers[i];
			vanishingFlower.x += x - vanishingFlower.x;
		}
		
		sprite.x = x;
	}
	
	spawn_nectar()
	{
		const flower = this.sprite;
		
		if (flower.animationFrame === 1) return;
		
		const nectarOptions = this.nectarOptions;
		
		let radius = nectarOptions.spawnRadius[flower.animationFrame];
		const configNectar = this.common.config["flower"]["nectar"];
		if (flower.animationName === "vanishing") radius = configNectar["spawn radius vanishing"];
		if (flower.animationName === "accelerating") radius = configNectar["spawn radius accelerating"];
		
		const [nectarMin, nectarMax] = nectarOptions.nectarMinAndMax;
		const size = nectarOptions.size;
		
		const len = Utils.getRandInt(nectarMin, nectarMax);
		const k = Mathutil.TWO_PI / len;
		const phase = Math.random() * Mathutil.TWO_PI;
		
		for (let i = 0; i < len; i++)
		{
			const angle = (i * k) + phase;
			const x = flower.x + (Math.cos(angle) * radius);
			const y = flower.y + (Math.sin(angle) * radius);
			
			const nectar = this.runtime.objects.Sprite_Nectar.createInstance("nectar", x, y);
			nectar.width *= size;
			nectar.height *= size;
			
			nectar.radius = nectar.width / 2;
			
			nectar.state = "";
			nectar.flower = this;
			nectar.type = "flower";
			this.nectars.push(nectar);
		}
	}
	
	set_behavior()
	{
		const flowerModifierConfig = this.common.config["modifiers flower"];
		const each = flowerModifierConfig["each"];
		const chance = flowerModifierConfig["chance"];
		
		if ((this.index % each) !== (each - 1)) return;
		
		if (Math.random() < (1 - chance)) return;
		
		const functions = [];
		
		if (this.common.game.is_there_modifier_on_level("vanishing")) functions.push(() => this._create_vanishing_flower());
		if (this.common.game.is_there_modifier_on_level("accelerating")) functions.push(() => this._create_accelerating_flower());
		if (this.common.game.is_there_modifier_on_level("vertical")) functions.push(() => this._change_vertical_behavior());
		if (this.common.game.is_there_modifier_on_level("horizontal")) functions.push(() => this._change_horizontal_behavior());
		
		if (functions.length === 0) return;
		
		const random = Utils.getRandInt(0, functions.length - 1);
		
		functions[random]();
	}
	
	_destroy()
	{
		this.sprite.destroy();
		
		this.vanishingFlowers.forEach(vanishingFlower => vanishingFlower.destroy());
		
		if (this.collisionMask !== null) this.collisionMask.destroy();
	}
	
	_create_vanishing_flower()
	{
		const sprite = this.sprite;
		sprite.setAnimation("vanishing");
		sprite.isVisible = false;
		
		for (let i = 0; i < 3; i++)
		{
			const vanishingFlower = this.runtime.objects.Sprite_Flower.createInstance("middleground", sprite.x, sprite.y);
			this.vanishingFlowers.push(vanishingFlower);
			vanishingFlower.setAnimation("vanishing");
			vanishingFlower.animationFrame = i;
			vanishingFlower.width = this.radius * 2;
			vanishingFlower.height *= (vanishingFlower.width / vanishingFlower.imageWidth);
		}
	}
	
	_set_vanishing_flower()
	{
		const speed = this.common.config["flower"]["vanishing speed"];
		
		const vanishingFlowers = this.vanishingFlowers;
		for (let i = vanishingFlowers.length - 1; i >= 0; i--)
		{
			const vanishingFlower = vanishingFlowers[i];
			if ((vanishingFlower.animation.frameCount - this.vanishingCount) <= i)
			{
				const [r, g, b] = vanishingFlower.colorRgb;
				const color = Utils.lerp_dt(g, 0, speed, this.runtime.dt);
				vanishingFlower.colorRgb = [1, color, color];
			}
		}
	}
	
	_check_vanishing_jump()
	{
		if (this.vanishingCount < 3) return;
		if (this.b_vanishingJump) return;
		
		this.b_vanishingJump = true;
		
		this.common.game.bee.set_state("jump");
	}
	
	_create_accelerating_flower()
	{
		this.sprite.setAnimation("accelerating");
	}
	
	_create_collision_mask()
	{
		if (!this.common.config["b_debug"]) return;
		
		const collisionMask = this.runtime.objects.Sprite_Collision_Mask.createInstance("bee", 0, 0);
		this.collisionMask = collisionMask;
		collisionMask.width = this.radius * 2;
		collisionMask.height = collisionMask.width;
		
		//@task. сюда бы boxWithTick.
	}
	
	_set_collision_mask_position()
	{
		if (this.collisionMask === null) return;
		
		const collisionMask = this.collisionMask;
		const sprite = this.sprite;
		
		collisionMask.x = sprite.x;
		collisionMask.y = sprite.y;
	}
	
	_change_vertical_behavior()
	{
		const flowerConfig = this.common.config["modifiers flower"]["vertical"];
		const sinePeriod = flowerConfig["sine period"];
		const sineMagnitude = flowerConfig["sine magnitude"];
		
		const sprite = this.sprite;
		
		sprite.startY = sprite.y;
		sprite.cycle = Math.random();
		
		const boxWithTick = new BoxWithTick();
		boxWithTick.append(this.sprite, () => {
			sprite.y = sprite.startY + (Math.sin((this.runtime.gameTime * sinePeriod) + (sprite.cycle * Mathutil.TWO_PI)) * sineMagnitude);
		});
	}
	
	_change_horizontal_behavior()
	{
		const flowerConfig = this.common.config["modifiers flower"]["horizontal"];
		const sinePeriod = flowerConfig["sine period"];
		const sineMagnitude = flowerConfig["sine magnitude"];
		
		const sprite = this.sprite;
		
		sprite.startX = sprite.x - (sineMagnitude * this.common.game._get_side_object_on_screen(sprite.x));
		sprite.cycle = Math.random();
		
		const boxWithTick = new BoxWithTick();
		boxWithTick.append(this.sprite, () => {
			sprite.x = sprite.startX + (Math.sin((this.runtime.gameTime * sinePeriod) + (sprite.cycle * Mathutil.TWO_PI)) * sineMagnitude);
		});
	}
}

class Game
{
	constructor(runtime, common)
	{
		this.runtime = runtime;
		this.common = common;
		
		this.runtime.addEventListener("tick", () => this._on_tick());
		this.runtime.addEventListener("pointerdown", e => this._on_pointerdown(e));
		
		globalThis.addEventListener("restart", () => { //@debug.
			this.destroy();
			this.restart();
		});
		
		this._set_flower_radius();
		
		Bee.instances = [];
		Flower.init();
		Web.instances = [];
		
		this.replacer = {
			0: "",
			1: "flower",
			2: "twin",
			3: "web",
			4: "hive",
		};
		
		this.border = {left: 0, right: 720};
		
		this.cameraY = null;
		
		this._create_background();
		
		this._create_lines();
		
		this.b_pause = true;
		this.b_loss = false;
		
		this.score = 0;
		this.scoreRetentionRateIndex = 0;
		
		this.arrayGeneration = [];
		
		this.flowerCount = 0;
		
		this.lives = null;
		
		this.tapsCount = 0;
		
		this.arrow = null;
	}
	
	restart()
	{
		this.b_loss = false;
		
		this.score = 0;
		this.scoreRetentionRateIndex = 0;
		
		this.lives = 1;
		
		this._change_background();
		
		this._generate_modifiers();
		
		this._print_monifiers();
		
		this._generate_objects();
		
		this.generate_taps_count();
		
		this._create_trail_of_nectar();
		
		//в отдельный метод:
		const flowers = Flower.instances;
		flowers.forEach((flower, index) => flower.thirdIndex = get_third(index, this.flowerCount));
		
		this._create_bee();
		
		this._camera_restart();
		
		const beeSprite = this.bee.sprite;
		this.arrow = this.runtime.objects.Sprite_Arrow.createInstance("bee", beeSprite.x, beeSprite.y);
	}
	
	generate_taps_count()
	{
		this.tapsCount = Math.ceil(this._get_count_flowers_on_level() * this.common.config["taps factor"]) + 1;
	}
	
	set_bee_to_last_flower()
	{
		this.b_loss = false;
		
		const bee = this.bee;
		const flower = this.bee.lastFlower;
		if (flower !== null)
		{
			const flowerSprite = flower.sprite;
		
			bee.x = flowerSprite.x;
			bee.y = flowerSprite.y;
			bee.set_flower(flower);
			bee.set_state("rotate");
		}
		else
		{
			const numberFlower = Math.floor(bee.flowerBeeAngle / Mathutil.TWO_PI) % 2;
			const flowerTwin = bee.lastFlowers[numberFlower];
			
			const flowerSprite = flowerTwin.sprite;
		
			bee.x = flowerSprite.x;
			bee.y = flowerSprite.y;
			bee.set_flowers(...bee.lastFlowers);
			bee.set_state("rotate infinity");
		}
	}
	
	pause()
	{
		this.b_pause = true;
	}
	
	resume()
	{
		this.b_pause = false;
	}
	
	destroy()
	{
		Flower.destroy_all();
		this._destroy_bees();
		this.runtime.objects.Sprite_Nectar.getAllInstances().forEach(nectar => nectar.destroy()); //в отдельный метод.
		this._destroy_spiders();
		this.runtime.objects.Sprite_Hive.getAllInstances().forEach(hive => hive.destroy()); //в отдельный метод.
		if (this.arrow !== null) //в отдельный метод.
		{
			this.arrow.destroy();
			this.arrow = null;
		}
	}
	
	get_count_flowers_to_end()
	{
		let result = 0;
		
		const level = this.arrayGeneration;
		
		if (this.bee.lastFlower !== null)
		{
			for (let i = this.bee.lastFlower.indexInArray + 1; i < level.length; i++)
			{
				const currentCell = level[i];
				
				if (["flower", "twin"].includes(currentCell)) result++;
			}
		}
		else
		{
			if (this.bee.lastFlowers.length > 0) //я не знаю зачем это, но это исправляет баг если я в начале игры два раза подряд умру не касаясь ни одного цветка. можно повторить в bee139.c3p.
			{
				for (let i = this.bee.lastFlowers[0].indexInArray + 1; i < level.length; i++)
				{
					const currentCell = level[i];
					
					if (["flower", "twin"].includes(currentCell)) result++;
				}
			}
		}
		
		return result;
	}
	
	is_there_modifier_on_level(modifier)
	{
		return this._get_modifiers().includes(modifier);
	}
	
	is_bee_overlapping_with_flower()
	{
		const bee = this.bee;
		
		const flowers = Flower.instances;
		for (let i = flowers.length - 1; i >= 0; i--)
		{
			const flower = flowers[i];
			const flowerSprite = flower.sprite;
			
			const deltaX = bee.x - flowerSprite.x;
			const deltaY = bee.y - flowerSprite.y;
			const radius = flower.radius + bee.radius;
			if (((deltaX * deltaX) + (deltaY * deltaY)) > (radius * radius)) continue;
			
			return true;
		}
		
		return false;
	}
	
	_on_tick()
	{
		if (this.b_pause) return;
		
		this._set_camera();
		
		this._set_lines();
		
		if (!this.b_loss)
		{
			this._check_collision_bee_and_flowers();
			this._check_collision_bee_and_nectars();
			this._check_collision_bee_and_spider();
			this._check_collision_bee_and_web();
			this._check_collision_bee_and_hive();
			this._check_outside_viewport_bee();
		}
		
		this._bee_tick();
		
		this._flowers_tick();
		
		this._set_nectar_opacity();
		
		this._spider_tick();
		
		this._set_arrow_position_and_angle();
	}
	
	_on_pointerdown(e)
	{
		if (this.b_pause) return;
		
		if (this.b_loss) return;
		
		const {clientX, clientY} = e;
		const [x, y] = this.runtime.layout.getLayer("hud").cssPxToLayer(clientX, clientY); //@task. заюзать в utilities функцию.
		const hud = this.common.hud;
		/*if (hud.level === "game")
		{
			if (hud.buttonPause.containsPoint(x, y)) return;
			if (hud.buttonSettings.containsPoint(x, y)) return;
		}*/
		
		if (this.tapsCount === 0) return;
		
		this.tapsCount--;
		
		this._bee_line(); //@debug.
		
		this._bee_rotate();
		
		this.bee.set_state("jump");
		
		this.bee.b_resetFlowers = true;
		
		hud.vibrate_please();
	}
	
	_bee_rotate()
	{
		if (this.bee.state !== "jump") return;
		
		const side = this._get_side_object_on_screen(this.bee.x);
		
		this.bee.moveAngle -= Math.PI / 2 * side;
		
		this.common.hud.play_sound("bee");
	}
	
	_bee_line()
	{
		if (this.bee.state === "rotate")
		{
			const flowerSprite = this.bee.flower.sprite;
			this.bee.moveAngle = Mathutil.angleTo(flowerSprite.x, flowerSprite.y, this.bee.x, this.bee.y);
		}
		if (this.bee.state === "rotate infinity")
		{
			const numberFlower = Math.floor(this.bee.flowerBeeAngle / Mathutil.TWO_PI) % 2;
			const flower = this.bee.flowers[numberFlower];
			this.bee.moveAngle = Mathutil.angleTo(flower.sprite.x, flower.sprite.y, this.bee.x, this.bee.y);
		}
	}
	
	get _quarter_height_screen()
	{
		return this._get_viewport("middleground").height / 4;
	}
	
	_get_viewport(layer)
	{
		return this.runtime.layout.getLayer(layer).getViewport();
	}
	
	_get_center_x(layer)
	{
		const viewport = this._get_viewport(layer);
		return (viewport.left + viewport.right) / 2;
	}
	
	_get_center_y(layer)
	{
		const viewport = this._get_viewport(layer);
		return (viewport.top + viewport.bottom) / 2;
	}
	
	_set_flower_radius()
	{
		const flowerRadius = this.common.config["flower"]["radius min and max"];
		this.flowerRadius = {min: flowerRadius[0], max: flowerRadius[1]};
	}
	
	_create_background()
	{
		const viewport = this._get_viewport("background");
		
		const background = this.runtime.objects.Sprite_Background.createInstance("background", this._get_center_x("background"), this._get_center_y("background"));
		this.background = background;
		const scale = Math.max(viewport.width / background.width, viewport.height / background.height);
		background.width *= scale;
		background.height *= scale;
	}
	
	_change_background()
	{
		const background = this.background;
		
		background.animationFrame = Utils.getRandInt(0, background.animation.frameCount - 1);
	}
	
	_create_lines()
	{
		if (!this.common.config["b_debug"]) return;
		
		const viewport = this._get_viewport("middleground");
		const centerX = this._get_center_x("middleground");
		const centerY = this._get_center_y("middleground");
		
		this.linesHorizontal = [];
		
		for (let i = 0; i < 3; i++)
		{
			//const line = this.runtime.objects.Sprite_Line.createInstance("middleground", centerX, 0);
			const line = this.runtime.objects.TiledBackground_Mask.createInstance("middleground", centerX, 0);
			line.width = viewport.width;
			line.height *= 2;
			line.opacity = 0.25;
			this.linesHorizontal.push(line); //переименовать в linesHorizontal.
			line.x -= line.width / 2;
		}
		
		this.linesVertical = [];
		const range = this.common.config["flower"]["spawn horizontal range"];
		const height = viewport.height;
		
		[-range, range].forEach(offset => {
			//const line = this.runtime.objects.Sprite_Line.createInstance("middleground", centerX + offset, centerY);
			const line = this.runtime.objects.TiledBackground_Mask.createInstance("middleground", centerX + offset, centerY);
			line.width *= 2;
			line.height = height;
			line.opacity = 0.25;
			this.linesVertical.push(line);
			line.x -= line.width / 2;
		});
		
		this._set_lines();
		
		//@task. тут бы boxWithTick...
	}
	
	_set_lines()
	{
		if (!this.common.config["b_debug"]) return;
		
		this.linesHorizontal.forEach((line, index) => {
			
			line.y = (this._get_viewport("middleground").top + ((index + 1) * this._quarter_height_screen)) - (line.height / 2);
		});
		
		this.linesVertical.forEach((line, index) => {
			
			line.y = this._get_center_y("middleground") - (line.height / 2);
		});
	}
	
	_set_camera()
	{
		const layout = this.runtime.layout;
		const viewportStart = this.viewportGameStart;
		const speed = this.common.config["camera"]["speed"];
		const scrollY = Utils.lerp_dt(layout.scrollY, this._get_scroll_y_from_flower_and_bee(), speed, this.runtime.dt);
		
		layout.scrollY = scrollY;
	}
	
	_get_scroll_y_from_flower_and_bee()
	{
		const bee = this.bee;
		
		/*let y = Flower.instances[0].sprite.y;
		if (bee.flowers.length > 0) y = bee.flowers[0].middleY;
		if (bee.flower !== null) y = bee.flower.sprite.y;*/
		
		const y = this.cameraY;
		
		const offset = this.common.config["camera"]["offset"];
		return Mathutil.lerp(y, bee.y, offset) - this._quarter_height_screen;
	}
	
	_check_collision_bee_and_flowers()
	{
		const bee = this.bee;
		//const beeSprite = bee.sprite;
		const flowers = Flower.instances;
		
		for (let i = flowers.length - 1; i >= 0; i--)
		{
			const flower = flowers[i];
			const flowerSprite = flower.sprite;
			
			const deltaX = bee.x - flowerSprite.x;
			const deltaY = bee.y - flowerSprite.y;
			const radius = flower.radius + bee.radius;
			if (((deltaX * deltaX) + (deltaY * deltaY)) > (radius * radius)) continue;
			
			if (bee.flower === flower) continue;
			if (bee.flowers.includes(flower)) continue;
			
			const startFlowerBeeAngle = Mathutil.angleTo(bee.jumpX, bee.jumpY, flowerSprite.x, flowerSprite.y);
			const flowerBeeAngle = Mathutil.angleTo(bee.jumpX, bee.jumpY, bee.x, bee.y);
			bee.direction = Mathutil.sign(startFlowerBeeAngle - flowerBeeAngle);
			if (bee.direction === 0) bee.direction = 1;
			
			bee.reset_speed();
			
			switch (flower.type)
			{
				case "":
				{
					this.cameraY = flowerSprite.y;
					bee.set_flower(flower);
					bee.set_state("rotate");
					break;
				}
				
				case "infinity":
				{
					this.cameraY = flower.middleY;
					bee.set_flowers(flower, flower.twinFlower);
					bee.set_state("rotate infinity");
					break;
				}
			}
			
			this.common.hud.vibrate_please();
			
			if (this.tapsCount === 0) this._bee_damage();
			
			return;
		}
	}
	
	_check_collision_bee_and_nectars()
	{
		const bee = this.bee;
		const beeSprite = bee.sprite;
		const nectars = this.runtime.objects.Sprite_Nectar.getAllInstances();
		
		const score = [5, 10, 15];
		
		for (let i = nectars.length - 1; i >= 0; i--)
		{
			const nectar = nectars[i];
			
			if (nectar.state === "fade") continue;
			
			const deltaX = beeSprite.x - nectar.x;
			const deltaY = beeSprite.y - nectar.y;
			const radius = nectar.radius + bee.radius;
			if (((deltaX * deltaX) + (deltaY * deltaY)) > (radius * radius)) continue;
			
			nectar.state = "fade";
			
			let addScore = 0;
			
			switch (nectar.type)
			{
				case "flower": addScore = score[nectar.flower.thirdIndex]; break;
				case "trail": addScore = 1; break;
			}
			
			this.score += addScore;
			
			this.common.hud.vibrate_please();
			
			this.common.hud.play_sound("nectar");
		}
	}
	
	_check_collision_bee_and_spider()
	{
		const bee = this.bee;
		const webs = Web.instances;
		
		for (let i = webs.length - 1; i >= 0; i--)
		{
			const web = webs[i];
			const webSprite = web.spiderWebSprite;
			
			const deltaX = bee.x - webSprite.x;
			const deltaY = bee.y - webSprite.y;
			const radius = (web.radius / 2) + bee.radius;
			if (((deltaX * deltaX) + (deltaY * deltaY)) > (radius * radius)) continue;
			
			this.cameraY = webSprite.y;
			const nextFlowerSprite = web.nextFlower.sprite;
			const angle = Mathutil.angleTo(bee.x, bee.y, nextFlowerSprite.x, nextFlowerSprite.y);
			bee.set_angle(angle);
			
			web.spider_damage();
			
			this.common.hud.vibrate_please();
			
			this.common.hud.play_sound("spider_death");
			
			const loot = Mathutil.choose(0, 1);
			if (loot === 0) this.score += 100;
			if (loot === 1) this.tapsCount += 3;
		}
	}
	
	_check_collision_bee_and_web()
	{
		const bee = this.bee;
		const webs = Web.instances;
		
		for (let i = webs.length - 1; i >= 0; i--)
		{
			const web = webs[i];
			const webSprite = web.sprite;
			
			const deltaX = bee.x - webSprite.x;
			const deltaY = bee.y - webSprite.y;
			const radius = (web.radius / 2) + bee.radius;
			if (((deltaX * deltaX) + (deltaY * deltaY)) > (radius * radius)) continue;
			
			bee.set_state("stop");
			
			this._bee_damage();
		}
	}
	
	_check_collision_bee_and_hive()
	{
		const bee = this.bee;
		const hives = this.runtime.objects.Sprite_Hive.getAllInstances();
		
		for (let i = hives.length - 1; i >= 0; i--)
		{
			const hive = hives[i];
			
			if (hive.b_state) continue;
			
			const deltaX = bee.x - hive.x;
			const deltaY = bee.y - hive.y;
			const radius = hive.radius + bee.radius;
			if (((deltaX * deltaX) + (deltaY * deltaY)) > (radius * radius)) continue;
			
			hive.b_state = true;
			
			this.cameraY = hive.y + 500; //500 на глаз.
			
			bee.hive = hive;
			bee.hiveRadius = radius;
			
			const startHiveBeeAngle = Mathutil.angleTo(bee.jumpX, bee.jumpY, hive.x, hive.y);
			const hiveBeeAngle = Mathutil.angleTo(bee.jumpX, bee.jumpY, bee.x, bee.y);
			bee.direction = Mathutil.sign(startHiveBeeAngle - hiveBeeAngle);
			
			bee.set_state("hive");
			
			this.common.game.b_loss = true;
		}
	}
	
	_check_outside_viewport_bee()
	{
		if (this.runtime.keyboard.isKeyDown("ShiftLeft")) return; //@debug.
		
		const viewport = this._get_viewport("bee");
		const bee = this.bee;
		if ((bee.x < viewport.left) || (bee.x > viewport.right) || (bee.y < viewport.top) || (bee.y > viewport.bottom))
		{
			this._bee_damage();
		}
	}
	
	_bee_damage()
	{
		if (this.b_loss) return;
		
		this.lives--;
		console.log('-1 live');
		if (this.lives > 0)
		{
			this.set_bee_to_last_flower();
		}
		else
		{
			this.b_loss = true;
			setTimeout(() => this.common.hud.lose(), 2000); //просто дизайнерская задержка.
		}
	}
	
	_get_array_generation()
	{
		const config = this.common.config;
		const configFlower = config["flower"];
		const [countMin, countMax] = config["b_debug"] ? configFlower["count spawn min and max debug"] : configFlower["count spawn min and max"];
		const count = Utils.getRandInt(countMin, countMax);
		const result = [1];
		let counter = 0;
		
		while (result.length < count)
		{
			const randomValue = Utils.getRandInt(0, 1);
			
			if (randomValue === 0) counter++;
			if (randomValue === 1) counter = 0;
			
			if (counter > 1)
			{
				continue;
			}
			
			result.push(randomValue);
		}
		
		return this._post_processing(result);
	}
	
	_post_processing(arr)
	{
		for (let i = 0; i < arr.length; i++)
		{
			const current = arr[i];
			const previous = arr[i - 1];
			const next = arr[i + 1];
			
			if ((current === 1) && (previous === 0) && (next === 0)) arr[i] = Mathutil.choose(1, 2);
		}
		
		if (this.is_there_modifier_on_level("spider"))
		{
			for (let i = 0; i < arr.length; i++)
			{
				const current = arr[i];
				const previous = arr[i - 1];
				const next = arr[i + 1];
				
				if ((current === 1) && (previous === 1) && (next === 1)) arr[i] = Mathutil.choose(1, 3);
			}
		}
		
		if (arr.at(-1) !== 0) arr.push(0);
		arr.push(4);
		
		for (let i = 0; i < arr.length; i++)
		{
			const current = arr[i];
			
			arr[i] = this.replacer[current];
		}
		
		return arr;
	}
	
	_generate_objects()
	{
		const arrayGeneration = this._get_array_generation();
		this.arrayGeneration = arrayGeneration;
		this._print_map(arrayGeneration);
		
		const {min: flowerRadiusMin, max: flowerRadiusMax} = this.flowerRadius;
		const config = this.common.config;
		const range = config["flower"]["spawn horizontal range"];
		
		const centerX = this._get_center_x("middleground");
		const viewport = this._get_viewport("middleground");
		
		const webSize = config["web"]["size"];
		const webOffsetX = config["web"]["offset x"];
		
		const border = this.border;
		
		let flowerCount = 0;
		
		for (let i = 0; i < arrayGeneration.length; i++)
		{
			const element = arrayGeneration[i];
			const y = i * -this._quarter_height_screen;
			
			switch (element)
			{
				case "flower":
				{
					/*const layout = this.runtime.layout;
					const viewport = layout.getLayer("middleground").getViewport();
					const offsetX = 200;
					const x = Utils.getRandInt(viewport.left + offsetX, viewport.right - offsetX);*/
					
					const previous = arrayGeneration[i - 1];
					
					const x = centerX + Mathutil.random(-range + flowerRadiusMax, range - flowerRadiusMax);
					
					const radius = Mathutil.random(flowerRadiusMin, flowerRadiusMax);
					const flower = this._create_flower({x, y, radius, type: "", addAngle: 0, inclineAngle: 0});
					flower.index = flowerCount++;
					flower.indexInArray = i;
					flower.set_behavior();
					flower.spawn_nectar();
					if (previous === "web")
					{
						const lastWeb = Web.instances.at(-1);
						lastWeb.set_flower(flower);
						
						const start = lastWeb.sprite.x + (webOffsetX * lastWeb.side);
						const end = lastWeb.side === 1 ? border.right - flower.radius : border.left + flower.radius;
						const x = Mathutil.random(start, end);
						flower.set_x(x);
					}
					
					break;
				}
				
				case "twin":
				{
					const x = centerX + Mathutil.random(-range + (flowerRadiusMax * 2), range - (flowerRadiusMax * 2));
					this._create_twin_flowers(x, y);
					break;
				}
				
				case "web":
				{
					const lastFlower = Flower.instances.at(-1);
					const side = this._get_side_object_on_screen(lastFlower.sprite.x);
					const web = new Web(this.runtime, this.common, {x: 0, y, size: webSize, side, config});
					
					const start = lastFlower.sprite.x + (webOffsetX * -side);
					const end = side === -1 ? border.right - web.radius : border.left + web.radius;
					const x = Mathutil.random(start, end);
					web.set_x(x);
					
					break;
				}
				
				case "hive":
				{
					const boxWithTick = new BoxWithTick();
					
					const size = config["hive"]["size"];
					const hive = this.runtime.objects.Sprite_Hive.createInstance("middleground", centerX, y);
					hive.width *= size;
					hive.height *= size;
					hive.radius = hive.width / 2;
					hive.b_state = false;
					hive.velocityX = hive.width;
					hive.velocityY = hive.height;
					const startWidth = hive.width;
					const startHeight = hive.height;
					boxWithTick.append(hive, () => {
						const ratio = 0.8;
						const speed = 10 * this.runtime.dt;
						hive.velocityX = Utils.springing(hive.velocityX, hive.width, startWidth, ratio, speed);
						hive.velocityY = Utils.springing(hive.velocityY, hive.height, startHeight, ratio, speed);
						hive.width += hive.velocityX;
						hive.height += hive.velocityY;
					});
					
					break;
				}
			}
		}
		
		this.flowerCount = flowerCount;
	}
	
	_create_trail_of_nectar()
	{
		const flowers = Flower.instances;
		
		const nectarConfig = this.common.config["flower"]["nectar"];
		const nectarSize = nectarConfig["size"];
		const nectarStep = nectarConfig["trail"]["step"];
		const nectarOffset = nectarConfig["trail"]["offset"];
		
		for (let i = 0; i < flowers.length - 1; i++)
		{
			const currentFlower = flowers[i];
			const currentFlowerSprite = currentFlower.sprite;
			
			const nextFlower = flowers[i + 1];
			const nextFlowerSprite = nextFlower.sprite;
			
			const anlgeCurrentNextFlower = Mathutil.angleTo(currentFlowerSprite.x, currentFlowerSprite.y, nextFlowerSprite.x, nextFlowerSprite.y);
			
			const anlgeNextCurrentFlower = anlgeCurrentNextFlower + Math.PI;
			
			const startX = currentFlowerSprite.x + (Math.cos(anlgeCurrentNextFlower) * currentFlower.radius);
			const startY = currentFlowerSprite.y + (Math.sin(anlgeCurrentNextFlower) * currentFlower.radius);
			
			const endX = nextFlowerSprite.x + (Math.cos(anlgeNextCurrentFlower) * nextFlower.radius);
			const endY = nextFlowerSprite.y + (Math.sin(anlgeNextCurrentFlower) * nextFlower.radius);
			
			const distance = Mathutil.distanceTo(startX, startY, endX, endY);
			
			const step = distance / nectarStep;
			
			const anglePerpendicular = anlgeCurrentNextFlower + (Math.PI / 2);
			const cosOffset = Math.cos(anglePerpendicular);
			const sinOffset = Math.sin(anglePerpendicular);
			
			for (let n = 0; n < step; n++)
			{
				const t = n / step;
				const offset = nectarOffset * ((n % 2) === 0 ? 1 : -1);
				const x = Mathutil.lerp(startX, endX, t) + (cosOffset * offset);
				const y = Mathutil.lerp(startY, endY, t) + (sinOffset * offset);
				
				const nectar = this.runtime.objects.Sprite_Nectar.createInstance("nectar", x, y);
				nectar.width *= nectarSize;
				nectar.height *= nectarSize;
				
				nectar.radius = nectar.width / 2;
			
				nectar.state = "";
				nectar.flower = currentFlower;
				nectar.type = "trail";
				currentFlower.nectars.push(nectar);
			}
		}
	}
	
	_create_bee()
	{
		const firstFlowerSprite = Flower.instances[0].sprite;
		
		//@duplicate #1 start.
		const config = this.common.config;
		const configBee = config["bee"];
		const size = configBee["size"];
		const speed = configBee["speed"];
		const smooth = configBee["smooth"];
		const configWings = configBee["wings"];
		const wingsSpeed = configWings["speed"];
		const wingsOffset = configWings["offset"];
		//@duplicate #1 end.
		const bee = new Bee(this.runtime, {x: firstFlowerSprite.x, y: firstFlowerSprite.y + 200, size, speed, smooth, wingsSpeed, wingsOffset}, this.common);
		this.bee = bee;
		//this.set_state("jump");
	}
	
	_create_twin_flowers(x, y)
	{
		const inclineAngle = Math.random() * Math.PI;
		const {min: flowerRadiusMin, max: flowerRadiusMax} = this.flowerRadius;
		const firstRadius = Mathutil.random(flowerRadiusMin, flowerRadiusMax);
		const secondRadius = Mathutil.random(flowerRadiusMin, flowerRadiusMax);
		
		const x1 = x - (Math.cos(inclineAngle) * firstRadius);
		const y1 = y - (Math.sin(inclineAngle) * firstRadius);
		
		const x2 = x + (Math.cos(inclineAngle) * secondRadius);
		const y2 = y + (Math.sin(inclineAngle) * secondRadius);
		
		const middleY = (y1 + y2) / 2;
		
		const type = "infinity";
		const firstFlower = this._create_flower({x: x1, y: y1, radius: firstRadius, type, addAngle: 0, inclineAngle, middleY});
		const secondFlower = this._create_flower({x: x2, y: y2, radius: secondRadius, type, addAngle: Math.PI, inclineAngle, middleY});
		firstFlower.set_twin_flower(secondFlower);
		secondFlower.set_twin_flower(firstFlower);
		firstFlower.spawn_nectar();
		secondFlower.spawn_nectar();
	}
	
	_create_flower(options)
	{
		const config = this.common.config;
		const nectarConfig = config["flower"]["nectar"];
		const nectarMinAndMax = nectarConfig["spawn count min and max"];
		const nectarSize = nectarConfig["size"];
		const nectarSpawnRadius = nectarConfig["spawn radius"];
		
		const nectarOptions = {nectarMinAndMax, size: nectarSize, spawnRadius: nectarSpawnRadius};
		
		return new Flower(this.runtime, this.common, options, nectarOptions);
	}
	
	_set_nectar_opacity()
	{
		const runtime = this.runtime;
		const nectars = runtime.objects.Sprite_Nectar.getAllInstances();
		const fadeTime = this.common.config["flower"]["nectar"]["fade time"];
		for (let i = nectars.length - 1; i >= 0; i--)
		{
			const nectar = nectars[i];
			
			if (nectar.state !== "fade") continue;
			
			nectar.opacity -= runtime.dt * fadeTime;
			
			if (nectar.opacity === 0)
			{
				nectar.destroy();
			}
		}
	}
	
	_destroy_bees()
	{
		const bees = Bee.instances;
		bees.forEach(bee => bee.destroy());
		bees.length = 0;
	}
	
	_bee_tick()
	{
		const bees = Bee.instances;
		for (let i = 0; i < bees.length; i++) bees[i].tick();
	}
	
	_flowers_tick()
	{
		const flowers = Flower.instances;
		for (let i = 0; i < flowers.length; i++) flowers[i].tick();
	}
	
	_destroy_spiders()
	{
		const spiders = Web.instances;
		spiders.forEach(spider => spider.destroy());
		spiders.length = 0;
	}
	
	_spider_tick()
	{
		const spiders = Web.instances; //как там несколько переменных в цикле объявлять?
		for (let i = 0; i < spiders.length; i++) spiders[i].tick();
	}
	
	_get_side_object_on_screen(x) //внешний метод.
	{
		return x >= this._get_center_x("middleground") ? 1 : -1;
	}
	
	_print_map(map)
	{
		const result = [];
		for (let i = 0; i < map.length; i++)
		{
			const current = map[i];
			
			for (const [key, val] of Object.entries(this.replacer))
			{
				if (current === val) result.push(Number(key));
				continue;
			}
		}
		
		console.log(result);
	}
	
	_camera_restart()
	{
		this.cameraY = null;
		this.runtime.layout.scrollY = this._get_scroll_y_from_flower_and_bee();
	}
	
	_get_modifiers()
	{
		if (!this._is_limit_modifiers_list()) return this.modifierList;
		
		const level = this.common.gameScore.get_player_level();
		const modifiers = this.common.config["modifiers"];
		
		return modifiers[level];
	}
	
	_print_monifiers()
	{
		const level = this.common.gameScore.get_player_level();
		console.log('modifiers:', level, this._get_modifiers());
	}
	
	_generate_modifiers()
	{
		if (this._is_limit_modifiers_list()) return;
		
		const level = this.common.gameScore.get_player_level();
		
		this.modifierList = [];
		
		const countModifiers = Math.random() <= 0.3 ? 3 : 2;
		console.log('generate modifiers', countModifiers);
		
		while (true)
		{
			this.modifierList = [];
			
			const randomModifiers = Utils.shuffle(["bee speed", "accelerating", "vanishing", "spider", "spider crazy", "vertical", "horozintal"]);
			
			for (let i = 0; i < countModifiers; i++)
			{
				this.modifierList.push(randomModifiers[i]);
			}
			
			if (this.modifierList.includes("spider") && this.modifierList.includes("spider crazy"))
			{
				console.warn('broke', this.modifierList);
				continue;
			}
			
			break;
		}
	}
	
	_is_limit_modifiers_list()
	{
		const level = this.common.gameScore.get_player_level();
		const modifiers = this.common.config["modifiers"];
		
		return level < Object.keys(modifiers).length;
	}
	
	_get_count_flowers_on_level()
	{
		let result = 0;
		
		this.arrayGeneration.forEach(object => {
			if (["flower", "twin"].includes(object)) result++;
		});
		
		return result;
	}
	
	_set_arrow_position_and_angle()
	{
		const arrow = this.arrow;
		
		if (arrow === null) return;
		
		const bee = this.bee;
		const beeSprite = bee.sprite;
		const direction = bee.direction === 1 ? -1 : 1;
		let infinityDirection = 1;
		
		if (bee.state === "rotate infinity") infinityDirection = bee.get_angle_and_direction_infinity();
		
		let angle = bee.moveAngle + ((Math.PI / 2) * direction * infinityDirection);
		const radius = 50; //на глаз.
		
		if (bee.state === "jump")
		{
			const side = this._get_side_object_on_screen(bee.x);
			
			angle = bee.moveAngle - ((Math.PI / 2) * side);
		}
		
		arrow.x = beeSprite.x + (Math.cos(angle) * radius);
		arrow.y = beeSprite.y + (Math.sin(angle) * radius);
		arrow.angle = angle;
	}
}

function get_third(index, count)
{
	const a = count / 3;
	const b = count * (2 / 3);
	if (index <= a) return 0;
	if (index <= b) return 1;
	return 2;
}

class GameScore
{
	constructor(common, assets, config)
	{
		this.common = common;
		this.assets = assets;
		this.config = config;
		
		this.b_debug = false;
		this.projectId = 0;
		this.publicToken = "";
		this.gameScoreConfig = null;
		this.gs = null;
		this.skipCount = 0;
		this.b_SDKLoaded = false;
		
		globalThis.addEventListener("get score", async () => { //@debug.
			const player = this.gs.player;
			await player.ready;
			console.log('[game score]: score', player.score);
		});
		
		globalThis.addEventListener("products", async () => { //@debug.
			if (this.b_debug) return;
			
			console.log(`[game score]: get products...`);
			const result = await this.gs.payments.fetchProducts();
			
			console.log('[game score]: products:', result["products"]);
			console.log('[game score]: player purchases:', result["playerPurchases"]);
			
			//gs.payments.on("error:fetchProducts", error => console.warn(`[game score] error fetchProducts`, error)); //@debug.
		});
		
		globalThis.addEventListener("purchase", async () => { //@debug.
			this.remove_ads();
		});
		
		globalThis.addEventListener("res", async () => { //@debug.
			console.log('res');
			
			this.add_score(-10);
			this.sync();
		});
		
		this.common.runtime.addEventListener("keydown", e => {
			if (e.code !== "KeyO") return;
			
			this.is_remove_ads_purchased();
			
			console.log(this.get_timestamp());
		});
		
		this.common.runtime.addEventListener("keydown", async e => {
			if (e.code !== "KeyQ") return;
			
			
		});
	}
	
	async init()
	{
		await this._set_load_config();
		
		const checkProtection = this.common.check_protection(`use strict${this.projectId}${this.publicToken}${document.domain}`);
		if (checkProtection > 0)
		{
			console.warn('Access denied.', checkProtection, document.domain);
			this.common.b_accessDenied = true;
			return;
		}
		
		console.log('Load GameScore...');
		
		if (this.b_debug)
		{
			this._SDK_load_compete_debug();
			return;
		}
		
		const sdkAvailable = await this._SDK_load();
		if (!sdkAvailable)
		{
			this._SDK_not_available();
			return;
		}
		
		globalThis.onGSInit = async gs => {
			this.gs = gs;
			
			if (!this.gs.isAllowedOrigin)
			{
				console.warn('Access denied. isAllowedOrigin:', this.gs.isAllowedOrigin);
				this.common.b_accessDenied = true;
				return;
			}
			
			await gs.player.ready; //@bugfix #1.
			
			this._SDK_load_complete();
			
			if (!this.is_remove_ads_purchased())
			{
				if (gs.ads.isAdblockEnabled)
				{
					globalThis.dispatchEvent(new CustomEvent("adblock"));
					return;
				}
				
				//await gs.ads.showPreloader();
				
				//gs.ads.showSticky();
			}
			
			gs.ads.on("fullscreen:close", success => this._send_event_ads_close()); //@task. это тоже походу перенести в gui.
			
			console.log('gs.payments.isAvailable', this.is_payments_available());
			
			//console.log('is sticky available', this.gs.ads.isStickyAvailable);
			
			console.warn('isAllowedOrigin', gs.isAllowedOrigin);
		};
	}
	
	show_leaderboard()
	{
		if (this.b_debug) return;
		
		this.gs.leaderboard.open(this.gameScoreConfig["leaderboard"]);
	}
	
	async get_leaderboard()
	{
		if (this.b_debug)
		{
			const result = await Utils.promise("files/test/leaderboard.json", this.common.runtime, 1000);
			
			return result;
		}
		
		const result = await this.gs.leaderboard.fetch(this.gameScoreConfig["leaderboard"]);
		
		return result;
	}
	
	show_ads_fullscreen()
	{
		if (this._is_debug_and_send_ads_close()) return;
		
		/*if (this.is_rewarded_video_available()) //@task. эм, что? почему тут вообще этот код?
		{
			this._send_event_ads_close();
			return;
		}*/
		
		if (this._is_skip()) return;
		
		this._reset_skip();
		
		this.gs.ads.showFullscreen();
	}
	
	async show_rewarded_video()
	{
		if (this._is_debug_and_send_ads_close()) return false; //а тут надо отправлять о закрытии рекламы разве?
		
		if (this.is_remove_ads_purchased()) return true;
		
		this._reset_skip();
		
		return await this.gs.ads.showRewardedVideo();
	}
	
	is_rewarded_video_available()
	{
		//return false; //@debug.
		if (this.b_debug) return false;
		
		return this.gs.ads.isRewardedAvailable;
	}
	
	add_score(score)
	{
		if (this.b_debug) return;
		
		this.gs.player.add("score", score);
		console.log('[game score]: add score', score);
	}
	
	add_level()
	{
		if (this.b_debug)
		{
			this.common.config["level"] += 1;
			
			return;
		}
		
		this.gs.player.add("level", 1);
		console.log('[game score]: level', this.get_player_level());
	}
	
	sync()
	{
		this.common.hud.leaderboard.b_needUpdate = true;
		
		if (this.b_debug)
		{
			globalThis.dispatchEvent(new CustomEvent("sync skip"));
			return;
		}
		
		this.gs.player.sync(); //await.
	}
	
	is_remove_ads_purchased()
	{
		//return false; //@debug.
		if (this.b_debug) return true;
		
		//return this.gs.payments.has(this.gameScoreConfig["remove ads id"]);
		return this.get_timestamp() > 0;
	}
	
	is_payments_available()
	{
		return this.gs.payments.isAvailable;
	}
	
	async remove_ads()
	{
		if (this.b_debug) return;
		
		console.log('remove ads');
		
		await this._purchase(this.gameScoreConfig["remove ads"]["purchase id"]);
		
		this._set_timestamp();
	}
	
	get_timestamp()
	{
		if (this.b_debug) return 0;
		
		const saveTimestamp = this.gs.player.get("timestamp");
		const saveTimestampDate = new Date(saveTimestamp);
		const currentTimestampDate = new Date(this.gs.serverTime);
		const result = saveTimestampDate - currentTimestampDate;
		return result > 0 ? result : 0;
	}
	
	check_remove_ads_and_close_sticky()
	{
		if (this.is_remove_ads_purchased()) this.gs.ads.closeSticky();
	}
	
	get_player_id()
	{
		if (this.b_debug) return 0;
		
		return this.gs.player.id;
	}
	
	get_player_level()
	{
		if (this.b_debug) return this.config["level"];
		
		return this.gs.player.get("level");
	}
	
	get_player_score()
	{
		if (this.b_debug) return 0;
		
		return this.gs.player.get("score");
	}
	
	get_milliseconds_remove_ads()
	{
		const removeAds = this.gameScoreConfig["remove ads"];
		
		if (this.b_debug) return removeAds["milliseconds debug"];
		
		return removeAds["milliseconds"];
	}
	
	get_ok_remove_ads()
	{
		return this.gameScoreConfig["remove ads"]["ok"];
	}
	
	get_hours_remove_ads()
	{
		return ((this.get_milliseconds_remove_ads() / 1000) / 60) / 60;
	}
	
	async purchase_boost()
	{
		console.log('purchase boost');
		
		await this._purchase(this.gameScoreConfig["boost"]["purchase id"]);
	}
	
	async purchase_resurrection()
	{
		console.log('purchase resurrection');
		
		await this._purchase(this.gameScoreConfig["resurrection"]["purchase id"]);
	}
	
	async get_price_boost()
	{
		const result = await this.gs.payments.fetchProducts();
		const boost = result["products"].filter(product => product["id"] === this.gameScoreConfig["boost"]["purchase id"])[0];
		return boost["price"];
	}
	
	async _set_load_config() //@task. надо сделать чтобы этот метод вызывался только один раз. если у меня не загрузится SDK с первого раза, то этот метод вызовется ещё раз.
	{
		const gameScoreJson = await this.assets.fetchJson("files/game_score.json");
		this.gameScoreConfig = gameScoreJson
		this.b_debug = gameScoreJson["b_debug"];
		this.projectId = gameScoreJson["project id"];
		this.publicToken = gameScoreJson["public token"];
		console.log(`%c[GAME SCORE]: ${this.b_debug ? 'disabled' : 'enabled'}`, `background-color: ${!this.b_debug? '#00ff00': '#e004bf'};`);
	}
	
	_send_event_ads_close()
	{
		globalThis.dispatchEvent(new CustomEvent("ads close"));
	}
	
	_is_skip() //тут плохо, потому что is выполняет действие, а не должна.
	{
		this.skipCount++;
		
		if (this.skipCount >= this.config["ads"]["skip count"]) return false;
		
		this._send_event_ads_close();
		return true;
	}
	
	_is_debug_and_send_ads_close() //тут плохо, потому что is выполняет действие, а не должна.
	{
		if (this.b_debug)
		{
			this._send_event_ads_close();
			return true;
		}
		
		return false;
	}
	
	_reset_skip()
	{
		this.skipCount = 0;
	}
	
	async _SDK_load()
	{
		return await LoadScript(`https://gs.eponesh.com/sdk/game-score.js?projectId=${this.projectId}&publicToken=${this.publicToken}&callback=onGSInit`);
	}
	
	_SDK_load_complete()
	{
		console.log('GameScore load complete.');
		this.b_SDKLoaded = true;
	}
	
	_SDK_load_compete_debug()
	{
		console.log(`GameScore load complete. Debug mode.`);
		this.b_SDKLoaded = true;
	}
	
	_SDK_not_available()
	{
		console.warn('SDK not available');
		globalThis.dispatchEvent(new CustomEvent("SDK not available"));
	}
	
	async _purchase(id)
	{
		console.log(`[game score]: purchase...`);
		return await this.gs.payments.purchase({"id": id}); //await.
	}
	
	_set_timestamp()
	{
		const serverTime = new Date(this.gs.serverTime);
		const removeTime = this.gameScoreConfig["remove ads"]["milliseconds"];
		serverTime.setMilliseconds(serverTime.getMilliseconds() + removeTime);
		this.gs.player.set("timestamp", serverTime.toISOString());
	}
}

class Hud
{
	constructor(runtime, common)
	{
		this.runtime = runtime;
		this.common = common;
		
		runtime.addEventListener("tick", () => this._on_tick());
		
		globalThis.addEventListener("tap gesture", e => this._on_tap_gesture(e.detail)); //переименовать в tap.
		
		//@task. нужно что-то сделать со всеми вот этими кастомными ивентами:
		globalThis.addEventListener("SDK not available", () => this._show("error", {textFirst: `Ошибка загрузки SDK`, textSecond: `Что-то пошло не так. Попробуйте ещё раз.`, buttonName: "again SDK", textButton: `Повторить`, buttonCallback: () => {
			this.common.gameScore.init();
			this._show("load_SDK");
		}}));
		globalThis.addEventListener("adblock", () => this._show("error", {textFirst: `Обнаружен адблок`, textSecond: `Отключите адблок и перезапустите приложение`, buttonName: "reload", textButton: `Перезагрузка`, buttonCallback: () => {
			this.runtime.callFunction("Reload");
		}}));
		globalThis.addEventListener("ads close", () => this.callbacks.fullscreenClose());
		globalThis.addEventListener("sync skip", () => this.callback());
		
		this._set_scales();
		
		this.levels = {
			"load_SDK": () => this._window_load_SDK(),
			"main": () => this._window_main(),
			"game": () => this._window_game(),
			"settings": () => this._window_settings(),
			"rating": () => this._window_rating(),
			"loss": () => this._window_loss(),
			"win": opts => this._window_win(opts),
			"win_with_increased": () => this._window_win_with_increased(),
			"error": options => this._window_error(options),
			"sync": () => this._window_sync(),
			"purchase": options => this._window_purchase(options),
			"access denied": () => this._window_access_denied(),
			"hives": () => this._window_hives(),
			"tutorial": () => this._window_tutorial(),
		};
		
		this.level = "";
		this.objects = [];
		this.buttons = [];
		
		this.transitionSpeed = common.config["hud"]["transition speed"];
		this.transitionTime = 0;
		this.b_transitionState = false;
		this.b_transitionNext = false;
		this.transitionOptions = null;
		
		this.b_startGame = false;
		
		this.buttonPause = null;
		this.buttonSettings = null;
		
		this.audio = null;
		
		this.textScore = null;
		
		this.sliderSpeed = 0.0001;
		this.vibrate = {
			slider: null,
			b_state: true
		};
		this.sound = {
			slider: null,
			b_state: true
		};
		
		this.callback = null; //@task. callback for sync. засунуть в this.callbacks.
		this.callbacks = {
			sync: null,
			fullscreenClose: null,
			purchase: null,
			paymentsUnavailable: null,
		};
		
		this.fonts = this.common.config["fonts"];
		
		this.leaderboard = new Leaderboard(this);
		
		this.isShowTutorial = false;
		
		this._show("load_SDK");
		
		this.runtime.addEventListener("keydown", e => { //@debug.
			if (e.code !== "KeyA") return;
			
			this._print_level();
		});
		
		this.runtime.addEventListener("keydown", e => { //@debug.
			if (e.code !== "KeyS") return;
			
			this._show("game");
		});
		
		this.runtime.addEventListener("keydown", e => { //@debug.
			if (e.code !== "KeyD") return;
			
			console.log(this.common.gameScore.get_timestamp());
		});
		
		this.runtime.addEventListener("keydown", e => { //@debug.
			if (e.code !== "Digit1") return;
			
			
		});
		
		
	}
	
	lose()
	{
		this._show("loss");
		
		this.play_sound("loss");
	}
	
	win()
	{
		this._show("win");
		
		this.play_sound("win");
	}
	
	vibrate_please() //please добавил, потому что есть уже свойство vibrate.
	{
		if (!this.vibrate.b_state) return;
		
		this.runtime.callFunction("Vibrate", this.common.config["vibrate ms"]);
	}
	
	play_sound(name)
	{
		if (!this.sound.b_state) return;
		
		this.runtime.callFunction("Play_Sound", name);
	}
	
	get_text_size_pt(size)
	{
		return size * this.scale;
	}
	
	_on_tick()
	{
		this._set_transition();
		
		this._set_slider_vibrate();
		this._set_slider_sound();
		
		this._check_sdk_loaded();
	}
	
	_on_tap_gesture(options) //x, y надо, а не options. и переименовать в просто on tap.
	{
		if (this.b_transitionState && (this.transitionTime < 0.5)) return;
		
		const {x, y} = options;
		
		const buttons = this.buttons;
		for (let i = 0; i < buttons.length; i++)
		{
			const button = buttons[i];
			
			if (button.containsPoint(x, y))
			{
				if (!button.b_enabled) continue;
				
				this._play_button_animation(button);
				
				this.vibrate_please();
				
				button.buttonTap?.();
				
				return;
			}
		}
	}
	
	_set_scales()
	{
		const viewport = this.runtime.layout.getLayer("hud").getViewport();
		this.width = viewport.width;
		this.height = viewport.height;
		this.top = viewport.top;
		this.left = viewport.left;
		this.right = viewport.right;
		this.bottom = viewport.bottom;
		this.originalWidth = this.right + this.left;
		this.originalHeight = this.bottom + this.top;
		this.centerX = (this.left + this.right) / 2;
		this.centerY = (this.top + this.bottom) / 2;
		this.figmaWidth = 1440;
		this.figmaHeight = 2560;
		
		this.scale = Math.min(this.width / this.figmaWidth, this.height / this.figmaHeight);
		
		this.boxWidth = this.figmaWidth * this.scale;
		this.boxHeight = this.figmaHeight * this.scale;
		this.boxX = (this.originalWidth * 0.5) - (this.boxWidth * 0.5);
		this.boxY = (this.originalHeight * 0.5) - (this.boxHeight * 0.5);
	}

	_metamorphosis(options, b_center=false) //внешний метод.
	{
		const {x = 0, y = 0, w = 0, h = 0} = options;
		
		const resultW = w * this.scale;
		const resultH = h * this.scale;
		
		return {
			x: (x * this.scale) + this.boxX + (b_center ? resultW / 2 : 0),
			y: (y * this.scale) + this.boxY + (b_center ? resultH / 2 : 0),
			w: resultW,
			h: resultH
		};
	}
	
	_destroy_objects()
	{
		const objects = this.objects;
		for (let i = objects.length - 1; i >= 0; i--) objects[i].destroy();
		objects.length = 0;
		
		const buttons = this.buttons;
		for (let i = buttons.length - 1; i >= 0; i--) buttons[i].destroy();
		buttons.length = 0;
	}
	
	_show(level, options=null)
	{
		this.b_transitionState = true;
		
		if (this.transitionTime >= 0.5) //я хотел это убрать, чтобы игрок случайно не пропустил какое-то окно. но оказалось это наобходимо для мгновенных переходов.
		{
			this.transitionTime = 1 - this.transitionTime;
			this.b_transitionNext = false;
		}
		
		this.level = level;
		this.transitionOptions = options;
	}
	
	_set_transition()
	{
		if (!this.b_transitionState) return;
		
		const runtime = this.runtime;
		
		this.transitionTime += runtime.dt * this.transitionSpeed;
		
		if (this.transitionTime >= 0.5)
		{
			if (!this.b_transitionNext)
			{
				this.b_transitionNext = true;
				
				this._destroy_objects();
				
				console.log(`move to`, this.level);
				
				this.levels[this.level](this.transitionOptions);
			}
		}
		
		if (this.transitionTime >= 1)
		{
			this.b_transitionState = false;
			this.transitionTime = 0;
			this.b_transitionNext = false;
		}
		
		const layer = runtime.layout.getLayer("hud");
		layer.opacity = 1 - Math.sin(this.transitionTime * Math.PI);
	}
	
	is_transition_level(level)
	{
		if (this.level !== level) return true;
		
		return !(!this.b_transitionState || (this.transitionTime >= 0.5));
	}
	
	_window_load_SDK()
	{
		const th = this._metamorphosis({x: 536, y: 1550, w: 370, h: 78});
		const textLoading = this.runtime.objects.Text_HUD.createInstance("hud", th.x, th.y);
		textLoading.width = th.w;
		textLoading.height = th.h;
		textLoading.text = 'Загрузка...';
		textLoading.horizontalAlign = "center";
		textLoading.verticalAlign = "center";
		this.objects.push(textLoading);
		
		this._create_bee({x: 380, y: 740, radius: 340});
	}
	
	_window_main()
	{
		let th = null;
		
		this._create_hives({b_animation: false});
		
		//this._create_button_remove_ads({coords: {x: 1044, y: 28, w: 370, h: 280}});
		
		const b_remove_ads_purchased = this.common.gameScore.is_remove_ads_purchased();
		const boxWithTick = new BoxWithTick();
		
		if (false)
		{
			if (!b_remove_ads_purchased)
			//if (false) //@debug.
			{
				let thInstance, thOffset = null;
				
				th = this._metamorphosis({x: 519 * 2, y: 8 * 2, w: 185 * 2, h: 175 * 2}, true);
				const buttonRemoveAds = this.runtime.objects.Sprite_Button.createInstance("hud", th.x, th.y);
				this._this_is_button(buttonRemoveAds, "remove ads");
				buttonRemoveAds.setAnimation("remove ads green");
				buttonRemoveAds.width = th.w;
				buttonRemoveAds.height = th.h;
				boxWithTick.append(buttonRemoveAds, () => {
					buttonRemoveAds.b_enabled = !b_remove_ads_purchased;
					buttonRemoveAds.colorRgb = b_remove_ads_purchased ? [1, 0, 0] : [1, 1, 1];
				});
				buttonRemoveAds.buttonTap = () => {
					this._click_remove_ads();
				};
				
				const buttonRemoveAdsBBox = buttonRemoveAds.getBoundingBox();
				
				const gameScore = this.common.gameScore;
				
				const [textHoursOffsetWidth, textHoursOffsetHeight] = [185, 83];
				thInstance = this._metamorphosis({w: textHoursOffsetWidth + 13, h: textHoursOffsetHeight + 168});
				thOffset = this._metamorphosis({w: textHoursOffsetWidth, h: textHoursOffsetHeight});
				const textHours = this.runtime.objects.Text_HUD.createInstance("hud", buttonRemoveAdsBBox.left + thOffset.w, buttonRemoveAdsBBox.top + thOffset.h);
				textHours.width = th.w - thInstance.w;
				textHours.height = th.h - thInstance.h;
				textHours.text = `${gameScore.get_hours_remove_ads()}ч`;
				textHours.horizontalAlign = "center";
				textHours.verticalAlign = "center";
				textHours.fontFace = this.fonts["ubuntu-medium"];
				textHours.sizePt = this.get_text_size_pt(36 * 2);
				this.objects.push(textHours);
				
				/*const [textOKOffsetWidth, textOKOffsetHeight] = [109, 230];
				thInstance = this._metamorphosis({w: textOKOffsetWidth + 166, h: textOKOffsetHeight + 14});
				thOffset = this._metamorphosis({w: textOKOffsetWidth, h: textOKOffsetHeight});
				const textOK = this.runtime.objects.Text_HUD.createInstance("hud", buttonRemoveAdsBBox.left + thOffset.w, buttonRemoveAdsBBox.top + thOffset.h);
				textOK.width = th.w - thInstance.w;
				textOK.height = th.h - thInstance.h;
				textOK.angleDegrees = 9;
				textOK.text = `${gameScore.get_ok_remove_ads()}`;
				textOK.horizontalAlign = "center";
				textOK.verticalAlign = "center";
				textOK.fontFace = this.fonts["ubuntu-medium"];
				textOK.fontColor = [242, 252, 36].map(color => color / 255);
				textOK.sizePt = this.get_text_size_pt(30 * 2);
				this.objects.push(textOK);*/
				
				th = this._metamorphosis({x: 1150, y: 250, w: 100, h: 100}); //всё на глаз.
				const textOK = this.runtime.objects.Text_HUD.createInstance("hud", th.x, th.y);
				textOK.width = th.w;
				textOK.height = th.h;
				textOK.angleDegrees = 9;
				textOK.text = `${gameScore.get_ok_remove_ads()}`;
				textOK.horizontalAlign = "center";
				textOK.verticalAlign = "center";
				textOK.fontFace = this.fonts["ubuntu-medium"];
				textOK.fontColor = [242, 252, 36].map(color => color / 255);
				textOK.sizePt = this.get_text_size_pt(30 * 2);
				this.objects.push(textOK);
			}
			else
			{
				th = this._metamorphosis({x: 1032, y: 66, w: 180, h: 178});
				const icon = this.runtime.objects.Sprite_Button.createInstance("hud", th.x, th.y);
				icon.setAnimation("remove ads purchase");
				icon.width = th.w;
				icon.height = th.h;
				this.objects.push(icon);
				
				th = this._metamorphosis({x: 1219, y: 115, w: 500, h: 500}); //@task. wh ?
				const textHours = this.runtime.objects.Text_HUD.createInstance("hud", th.x, th.y);
				textHours.width = th.w;
				textHours.height = th.h;
				//textHours.text = `72:00`; //@task. реальные значения поставить.
				textHours.fontFace = this.fonts["ubuntu-bold"];
				textHours.fontColor = [52, 18, 12].map(color => color / 255);
				textHours.sizePt = this.get_text_size_pt(190 / 3.5); //на глаз делил.
				this.objects.push(textHours);
				boxWithTick.append(textHours, () => {
					const timestamp = this.common.gameScore.get_timestamp();
					const seconds = timestamp / 1000;
					const minutes = Math.floor(seconds / 60);
					const minutesPad = String(minutes).padStart(2, "0");
					const hours = Math.floor((seconds / 60) / 60);
					const hoursPad = String(hours).padStart(2, "0");
					textHours.text = `${hoursPad}:${minutesPad}`;
				});
			}
		}
		
		th = this._metamorphosis({x: 180 * 2, y: 1064 * 2, w: 360 * 2, h: 200 * 2}, true);
		const buttonStartGame = this.runtime.objects.Sprite_Button.createInstance("hud", th.x, th.y);
		this._this_is_button(buttonStartGame, "start game");
		buttonStartGame.b_animation = true;
		buttonStartGame.setAnimation("play");
		buttonStartGame.width = th.w;
		buttonStartGame.height = th.h;
		buttonStartGame.buttonTap = () => {
			this._show("game");
		};
		
		this._create_button_settings();
		
		th = this._metamorphosis({x: 554 * 2, y: 1114 * 2, w: 150 * 2, h: 150 * 2}, true);
		const buttonRating = this.runtime.objects.Sprite_Button.createInstance("hud", th.x, th.y);
		this._this_is_button(buttonRating, "rating");
		buttonRating.b_animation = true;
		buttonRating.setAnimation("rating");
		buttonRating.width = th.w;
		buttonRating.height = th.h;
		buttonRating.buttonTap = () => {
			this._show("rating");
			
			this.play_sound("rating");
		};
		
		this._play_music("menu");
		
		this._print_level();
	}
	
	_window_game()
	{
		let th = null;
		
		const fontFace = this.fonts["ubuntu-medium"];
		const fontColor = [247, 229, 45].map(color => color / 255);
		const textSize = 100; //на глаз.
		
		const boxWithTick = new BoxWithTick();
		
		th = this._metamorphosis({x: 16 * 2, y: 16 * 2, w: 134 * 2, h: 145 * 2}, true);
		const buttonPause = this.runtime.objects.Sprite_Button.createInstance("hud", th.x, th.y);
		this._this_is_button(buttonPause, "pause");
		buttonPause.setAnimation("taps counter");
		buttonPause.width = th.w;
		buttonPause.height = th.h;
		this.buttonPause = buttonPause;
		buttonPause.buttonTap = () => {
			this.common.game.pause();
			this._show("settings");
		};
		
		th = this._metamorphosis({x: 16 * 2, y: 16 * 2, w: 134 * 2, h: 133 * 2});
		const textPause = this.runtime.objects.Text_HUD.createInstance("hud", th.x, th.y);
		textPause.width = th.w;
		textPause.height = th.w;
		textPause.text = `0`;
		textPause.horizontalAlign = "center";
		textPause.verticalAlign = "center";
		textPause.fontFace = fontFace;
		textPause.fontColor = fontColor;
		textPause.sizePt = this.get_text_size_pt(textSize);
		this.objects.push(textPause);
		boxWithTick.append(textPause, () => {
			if (this.is_transition_level("game")) return;
			
			textPause.text = `${this.common.game.tapsCount}`;
		});
		
		th = this._metamorphosis({x: 504 * 2, y: 16 * 2, w: 200 * 2, h: 117 * 2});
		const scoreCounter = this.runtime.objects.Sprite_Button.createInstance("hud", th.x, th.y);
		scoreCounter.setAnimation("score counter");
		scoreCounter.width = th.w;
		scoreCounter.height = th.h;
		this.objects.push(scoreCounter);
		
		th = this._metamorphosis({x: 524 * 2, y: 16 * 2, w: 124 * 2, h: 102 * 2});
		const textScore = this.runtime.objects.Text_HUD.createInstance("hud", th.x, th.y);
		textScore.width = th.w;
		textScore.height = th.h;
		textScore.text = `0`;
		textScore.horizontalAlign = "center";
		textScore.verticalAlign = "center";
		textScore.fontFace = fontFace;
		textScore.fontColor = fontColor;
		textScore.sizePt = this.get_text_size_pt(textSize);
		this.objects.push(textScore);
		boxWithTick.append(textScore, () => {
			if (this.is_transition_level("game")) return;
		
			textScore.text = `${this.common.game.score}`;
		});
		
		this._create_button_settings({buttonCallback: () => {
			this.common.game.pause();
			this._show("settings");
		}});
		
		if (!this.b_startGame)
		{
			this.b_startGame = true;
			this.common.game.restart();
			this._play_music("game");
		}
		
		this.common.game.resume();
		
		this._show_tutorial();
	}
	
	_window_settings()
	{
		const b_startGame = this.b_startGame;
		
		let th = null;
		
		th = this._metamorphosis({x: 0, y: 0, w: 720 * 2, h: 1280 * 2});
		const tableSettings = this.runtime.objects.Sprite_Table.createInstance("hud", th.x, th.y);
		tableSettings.setAnimation("settings");
		tableSettings.width = th.w;
		tableSettings.height = th.h;
		this.objects.push(tableSettings);
		
		if (false)
		{
			th = this._metamorphosis({x: 85 * 2, y: 604 * 2, w: 550 * 2, h: 70 * 2});
			const textAuthor = this.runtime.objects.Text_HUD.createInstance("hud", th.x, th.y);
			textAuthor.width = th.w;
			textAuthor.height = th.h;
			//`Music by Josh Woodward.\nMain menu - "East Side Bar";\nGame - "Water in the Creek";\nFree download: http://joshwoodward.com/`;
			textAuthor.text = `Автор музыки - Josh Woodward\nwww.joshwoodward.com`;
			textAuthor.horizontalAlign = "center";
			textAuthor.verticalAlign = "center";
			textAuthor.fontFace = this.fonts["ubuntu-regular"];
			textAuthor.fontColor = [136, 22, 39].map(color => color / 255);
			textAuthor.sizePt = this.get_text_size_pt(16 * 2);
			this.objects.push(textAuthor);
		}
		
		if (false)
		{
			if (!this.common.gameScore.is_remove_ads_purchased())
			{
				th = this._metamorphosis({x: 198 * 2, y: 700 * 2, w: 324 * 2, h: 180 * 2}, true);
				const buttonRemoveAds = this.runtime.objects.Sprite_Button.createInstance("hud", th.x, th.y);
				this._this_is_button(buttonRemoveAds, "remove ads");
				buttonRemoveAds.setAnimation("remove ads");
				buttonRemoveAds.animationFrame = 2;
				buttonRemoveAds.width = th.w;
				buttonRemoveAds.height = th.h;
				buttonRemoveAds.buttonTap = () => {
					this._click_remove_ads();
				};
				
				const gameScore = this.common.gameScore;
				
				th = this._metamorphosis({x: 310 * 2, y: 708 * 2, w: 100 * 2, h: 50 * 2});
				const textTime = this.runtime.objects.Text_HUD.createInstance("hud", th.x, th.y);
				textTime.width = th.w;
				textTime.height = th.h;
				textTime.text = `${gameScore.get_hours_remove_ads()}ч`;
				textTime.horizontalAlign = "center";
				textTime.verticalAlign = "center";
				textTime.fontFace = this.fonts["ubuntu-medium"];
				textTime.fontColor = [37, 84, 37].map(color => color / 255);
				textTime.sizePt = this.get_text_size_pt(38 * 2);
				this.objects.push(textTime);
				
				th = this._metamorphosis({x: 300 * 2, y: 796 * 2, w: 60 * 2, h: 50 * 2});
				const textOK = this.runtime.objects.Text_HUD.createInstance("hud", th.x, th.y);
				textOK.width = th.w;
				textOK.height = th.h;
				textOK.text = `${gameScore.get_ok_remove_ads()}`;
				textOK.horizontalAlign = "center";
				textOK.verticalAlign = "center";
				textOK.fontFace = this.fonts["ubuntu-medium"];
				textOK.fontColor = [255, 255, 0].map(color => color / 255);
				textOK.sizePt = this.get_text_size_pt(38 * 2);
				this.objects.push(textOK);
			}
		}
		
		if (b_startGame)
		{
			th = this._metamorphosis({x: 375 * 2, y: 930 * 2, w: 288 * 2, h: 160 * 2}, true);
		}
		else
		{
			th = this._metamorphosis({x: 198 * 2, y: 900 * 2, w: 324 * 2, h: 180 * 2}, true);
		}
		const buttonReturn = this.runtime.objects.Sprite_Button.createInstance("hud", th.x, th.y);
		this._this_is_button(buttonReturn, b_startGame ? "return game" : "return main menu");
		buttonReturn.setAnimation("return settings");
		buttonReturn.width = th.w;
		buttonReturn.height = th.h;
		buttonReturn.buttonTap = () => {
			if (b_startGame) this._show("game");
			else this._show("main");
		};
		
		this.sound.slider = this._create_slider({x: 103 * 2, name: "sound", b_state: this.sound.b_state, buttonCallback: () => {
			//@task вынести в отдельный метод.
			this.sound.b_state = !this.sound.b_state;
			if (this.sound.b_state) this._play_music(this.b_startGame ? "game" : "menu");
			else this._stop_music();
		}});
		this.vibrate.slider = this._create_slider({x: 394 * 2, name: "vibrate", b_state: this.vibrate.b_state, buttonCallback: () => {
			this.vibrate.b_state = !this.vibrate.b_state;
		}});
		
		if (b_startGame)
		{
			th = this._metamorphosis({x: 117, y: 930 * 2, w: 288 * 2, h: 160 * 2}, true);
			const buttonExit = this.runtime.objects.Sprite_Button.createInstance("hud", th.x, th.y);
			this._this_is_button(buttonExit, "exit");
			buttonExit.setAnimation("exit settings");
			buttonExit.width = th.w;
			buttonExit.height = th.h;
			buttonExit.buttonTap = () => {
				this.common.game.destroy();
				this.b_startGame = false;
				this._show("main");
			};
		}
	}
	
	_window_rating()
	{
		let th = null;
		
		th = this._metamorphosis({x: 0, y: 0, w: 720 * 2, h: 1064 * 2});
		const tableScore = this.runtime.objects.Sprite_Table.createInstance("hud", th.x, th.y);
		this._this_is_button(tableScore, "table score");
		tableScore.setAnimation("rating");
		tableScore.width = th.w;
		tableScore.height = th.h;
		tableScore.buttonTap = () => {
			//this.common.gameScore.show_leaderboard();
		};
		
		th = this._metamorphosis({x: 180 * 2, y: 1064 * 2, w: 360 * 2, h: 200 * 2}, true);
		const buttonBack = this.runtime.objects.Sprite_Button.createInstance("hud", th.x, th.y);
		this._this_is_button(buttonBack, "back");
		buttonBack.b_animation = true;
		buttonBack.setAnimation("rating back");
		buttonBack.width = th.w;
		buttonBack.height = th.h;
		buttonBack.buttonTap = () => {
			this._show("main");
		};
		
		this.leaderboard.create_players();
	}
	
	_window_loss()
	{
		let th = null;
		
		th = this._metamorphosis({x: 0, y: 0, w: 720 * 2, h: 1280 * 2});
		const table = this.runtime.objects.Sprite_Table.createInstance("hud", th.x, th.y);
		table.setAnimation("win or loss");
		table.animationFrame = 0;
		table.width = th.w;
		table.height = th.h;
		this.objects.push(table);
		
		th = this._metamorphosis({x: 400 * 2, y: 530 * 2, w: 170 * 2, h: 74 * 2});
		const textScore = this.runtime.objects.Text_HUD.createInstance("hud", th.x, th.y);
		textScore.width = th.w;
		textScore.height = th.h;
		textScore.text = `${this.common.game.score}`;
		textScore.horizontalAlign = "center";
		textScore.verticalAlign = "center";
		textScore.fontFace = this.fonts["ubuntu-medium"];
		textScore.fontColor = [254, 208, 5].map(color => color / 255);
		textScore.sizePt = this.get_text_size_pt(48 * 2);
		textScore.isBold = true;
		this.objects.push(textScore);
		
		th = this._metamorphosis({x: 400 * 2, y: 650 * 2, w: 170 * 2, h: 74 * 2});
		const textCountFlowers = this.runtime.objects.Text_HUD.createInstance("hud", th.x, th.y);
		textCountFlowers.width = th.w;
		textCountFlowers.height = th.h;
		textCountFlowers.text = `${this.common.game.get_count_flowers_to_end()}`;
		textCountFlowers.horizontalAlign = "center";
		textCountFlowers.verticalAlign = "center";
		textCountFlowers.fontFace = this.fonts["ubuntu-medium"];
		textCountFlowers.fontColor = [150, 255, 248].map(color => color / 255);
		textCountFlowers.sizePt = this.get_text_size_pt(48 * 2);
		textCountFlowers.isBold = true;
		this.objects.push(textCountFlowers);
		
		th = this._metamorphosis({x: 80 * 2, y: 850 * 2, w: 270 * 2, h: 150 * 2}, true);
		const buttonAgain = this.runtime.objects.Sprite_Button.createInstance("hud", th.x, th.y);
		this._this_is_button(buttonAgain, "again");
		buttonAgain.setAnimation("again");
		buttonAgain.width = th.w;
		buttonAgain.height = th.h;
		buttonAgain.buttonTap = () => {
			this._push_score_and_show_fullscreen_ads_and_move_to_game({b_win: false});
		};
		
		th = this._metamorphosis({x: 750, y: 850 * 2, w: 270 * 2, h: 150 * 2}, true);
		const buttonContinue = this.runtime.objects.Sprite_Button.createInstance("hud", th.x, th.y);
		this._this_is_button(buttonContinue, "continue");
		buttonContinue.setAnimation("resurrect ok");
		buttonContinue.width = th.w;
		buttonContinue.height = th.h;
		buttonContinue.buttonTap = async () => {
			const callback = () => {
				this.common.game.set_bee_to_last_flower();
				this._set_score_retention_rate();
				this.common.game.generate_taps_count();
				this._show("game");
			};
			/*if (this.common.gameScore.is_rewarded_video_available())
			{
				this._show_rewarded_video(() => {
					callback();
				}, () => null);
			}
			else
			{
				await Mathutil.wait(100); //хз почему, но почему-то пчела начинает лететь.
				callback();
			}*/
			this._purchase_ressurection(() => null, () => this._show("loss"));
			const gsPurchase = await Utils.event_promise(globalThis, "gs purchase");
			if (gsPurchase.detail.isSuccess)
			{
				await Mathutil.wait(100); //хз почему, но почему-то пчела начинает лететь.
				callback();
			}
			else
			{
				this._show("loss");
			}
		};
		
		//this._set_button_rewarded_video(buttonContinue);
	}
	
	async _window_win(opts)
	{
		if (opts === null) opts = {};
		const {b_increase=false} = opts;
		
		let th = null;
		
		const price = await this.common.gameScore.get_price_boost();
		
		th = this._metamorphosis({x: 0, y: 0, w: 1440, h: 2560});
		const table = this.runtime.objects.Sprite_Table.createInstance("hud", th.x, th.y);
		table.setAnimation("win or loss");
		table.animationFrame = 3;
		table.width = th.w;
		table.height = th.h;
		this.objects.push(table);
		
		th = this._metamorphosis({x: 80 * 2, y: 850 * 2, w: 270 * 2, h: 150 * 2}, true);
		const buttonContinue = this.runtime.objects.Sprite_Button.createInstance("hud", th.x, th.y);
		this._this_is_button(buttonContinue, "continue");
		buttonContinue.setAnimation("next");
		buttonContinue.width = th.w;
		buttonContinue.height = th.h;
		buttonContinue.buttonTap = () => {
			this._push_score_and_show_fullscreen_ads_and_move_to_game({b_win: true});
		};
		
		if (!b_increase)
		{
			th = this._metamorphosis({x: 741, y: 850 * 2, w: 270 * 2, h: 150 * 2}, true);
			const buttonIncrease = this.runtime.objects.Sprite_Button.createInstance("hud", th.x, th.y);
			this._this_is_button(buttonIncrease, "increase");
			buttonIncrease.setAnimation("increase ok");
			buttonIncrease.width = th.w;
			buttonIncrease.height = th.h;
			buttonIncrease.buttonTap = async () => {
				/*this._show_rewarded_video(() => {
					this.common.game.score *= 2;
					this._show("win", {b_increase: true});
				}, () => null);*/
				/*this._purchase_boost(() => {
					this.common.game.score *= 2;
					this._show("win", {b_increase: true});
				}, () => this._show("win"));*/
				this._purchase_boost(() => null, () => this._show("win"));
				const gsPurchase = await Utils.event_promise(globalThis, "gs purchase");
				if (gsPurchase.detail.isSuccess)
				{
					this.common.game.score *= 2;
					this._show("win", {b_increase: true});
				}
				else
				{
					this._show("win");
				}
			};
			
			th = this._metamorphosis({x: 380, y: 1830, w: 580 * 2, h: 80 * 2}); //всё на глаз.
			const textPrice = this.runtime.objects.Text_HUD.createInstance("hud", th.x, th.y);
			textPrice.width = th.w;
			textPrice.height = th.h;
			textPrice.text = `${price}`;
			textPrice.horizontalAlign = "center";
			textPrice.verticalAlign = "center";
			textPrice.fontFace = this.fonts["ubuntu-medium"];
			textPrice.fontColor = [242, 252, 36].map(color => color / 255);
			textPrice.sizePt = this.get_text_size_pt(30 * 2);
			this.objects.push(textPrice);
			
			//this._set_button_rewarded_video(buttonIncrease);
		}
		
		th = this._metamorphosis({x: 70 * 2, y: 520 * 2, w: 580 * 2, h: 80 * 2});
		const textInfo = this.runtime.objects.Text_HUD.createInstance("hud", th.x, th.y);
		textInfo.width = th.w;
		textInfo.height = th.h;
		textInfo.text = 'вы набрали';
		textInfo.horizontalAlign = "center";
		textInfo.fontFace = this.fonts["ubuntu-medium"];
		textInfo.fontColor = [111, 33, 39].map(color => color / 255);
		textInfo.sizePt = this.get_text_size_pt(40 * 2);
		textInfo.isBold = true;
		this.objects.push(textInfo);
		
		const boxWithTick = new BoxWithTick();
		
		th = this._metamorphosis({x: 245 * 2, y: 608 * 2, w: 220 * 2, h: 100 * 2});
		const textScore = this.runtime.objects.Text_HUD.createInstance("hud", th.x, th.y);
		textScore.width = th.w;
		textScore.height = th.h;
		textScore.text = ``;
		textScore.horizontalAlign = "center";
		textScore.verticalAlign = "center";
		textScore.fontFace = this.fonts["ubuntu-medium"];
		textScore.fontColor = [254, 208, 5].map(color => color / 255);
		textScore.sizePt = this.get_text_size_pt(60 * 2);
		textScore.isBold = true;
		this.objects.push(textScore);
		const score = this.common.game.score;
		if (b_increase)
		{
			textScore.halfScore = score / 2;
			textScore.startTime = this.runtime.gameTime;
		}
		boxWithTick.append(textScore, () => {
			if (b_increase)
			{
				const t = Math.min((this.runtime.gameTime - textScore.startTime) / 2, 1);
				const endScore = Math.round(Mathutil.lerp(textScore.halfScore, score, t));
				textScore.text = `${endScore}`;
			}
			else
			{
				textScore.text = `${score}`;
			}
		});
		
		this._create_nectars();
		
		console.log(`win with score:`, this.common.game.score);
		
		this.common.gameScore.add_level();
	}
	
	_window_win_with_increased()
	{
		const th = this._metamorphosis({x: 0, y: 230, w: 1442, h: 1612});
		const table = this.runtime.objects.Sprite_Table.createInstance("hud", th.x, th.y);
		table.setAnimation("win or loss");
		table.animationFrame = 2;
		table.width = th.w;
		table.height = th.h;
		this.objects.push(table);
		
		this._create_button_remove_ads({coords: {x: 503, y: 1231, w: 436, h: 232}, animationFrame: 1, b_dark: true});
		
		this._create_button_yellow({x: 502, y: 1479, name: "continue", text: `Продолжить`, buttonCallback: () => {
			const callback = () => {
				this.b_startGame = false;
				this._show("game");
			};
			
			this._push_score() === true ? this._sync(callback) : callback();
		}});
		
		this._create_win_border();
		
		this._create_nectars();
	}
	
	_window_error(options)
	{
		const {textFirst, textSecond, buttonName, textButton, buttonCallback} = options;
		
		this._create_table_error({animationFrame: 1});
		
		this._create_button_yellow({x: 502, y: 1472, name: buttonName, text: textButton, buttonCallback});
		
		this._create_text_title_table_loss({textFirst, textSecond});
	}
	
	_window_sync()
	{
		this.common.gameScore.sync();
	}
	
	_window_message() //не используется.
	{
		const {textFirst, textSecond} = options;
		
		this._create_table_error({animationFrame: 0});
		
		this._create_text_title_table_loss({textFirst, textSecond});
	}
	
	_window_purchase(options)
	{
		const {callback, item} = options;
		
		this.callbacks.purchase = callback;
		
		this._create_table_message();
		
		this._create_text_title_table_loss({textFirst: `Подтверждение оплаты`, textSecond: `Пожалуйста, подождите. Это окно закроется автоматически.`});
		
		switch (item)
		{
			case "remove ads": this.common.gameScore.remove_ads(); break;
			case "boost": this.common.gameScore.purchase_boost(); break;
			case "ressurection": this.common.gameScore.purchase_resurrection(); break;
		}
	}
	
	_window_access_denied()
	{
		this._show("error", {textFirst: `Нелицензионная версия`, textSecond: `Было обнаружено, что вами используется пиратская версия игры. Для того, чтобы сыграть в игру, просьба перейти по ссылке.`, buttonName: "go to original", textButton: `Перейти`, buttonCallback: () => {
			document.location.href = this.common.config["ok link"];
		}});
	}
	
	_window_hives()
	{
		this._create_hives({b_animation: true});
	}
	
	async _window_tutorial()
	{
		this.common.game.pause();
		
		const runtime = this.runtime;
		let th = null;
		const bottomTextColor = "#F7E52D"; //[247, 229, 45] (но надо уточнить.)
		
		th = this._metamorphosis({x: 734, y: 1117, w: 1245, h: 1470 * 1.24});
		const panel = this.runtime.objects.Sprite_Panel_Tutorial.createInstance("hud", th.x, th.y);
		panel.width = th.w;
		panel.height = th.h;
		this.objects.push(panel);
		
		const panelBBox = panel.getBoundingBox();
		const textTutorial = this.runtime.objects.Text.createInstance("hud", panelBBox.left, panelBBox.top);
		textTutorial.width = th.w;
		textTutorial.height = th.h;
		textTutorial.horizontalAlign = "center";
		textTutorial.verticalAlign = "center";
		textTutorial.fontFace = this.fonts["georgia"];
		textTutorial.fontColor = [1, 1, 1];
		textTutorial.sizePt = this.get_text_size_pt(279 / 5); //на глаз.
		textTutorial.isBold = true;
		this.objects.push(textTutorial);
		textTutorial.set_text = text => textTutorial.text = text;
		
		textTutorial.set_text(`СОБЕРИ НЕКТАР И\nДОСТАВЬ В УЛЕЙ.\n\nНЕ ПОЗВОЛЯЙ ПЧЕЛЕ\nУЛЕТЕТЬ ЗА ЭКРАН.\n\n[color=${bottomTextColor}]ДЛЯ ПРОДОЛЖЕНИЯ\nКОСНИСЬ ЭКРАНА[/color]`);
		
		await Utils.event_promise(globalThis, "tap gesture");
		
		textTutorial.set_text(`РЯДОМ С ЦВЕТАМИ\nПЧЕЛА ЛЕТАЕТ ПО КРУГУ.\n\nСТРЕЛКА ПОКАЗЫВАЕТ\nНАПРАВЛЕНИЕ ПОЛЁТА,\nПОСЛЕ КАСАНИЯ.\n\n[color=${bottomTextColor}]ДЛЯ ПРОДОЛЖЕНИЯ\nКОСНИСЬ ЭКРАНА.[/color]`);
		
		await Utils.event_promise(globalThis, "tap gesture");
		
		textTutorial.set_text(`КАЖДОЕ КАСАНИЕ -\nПОВОРОТ ПЧЕЛЫ.\n\nКОЛ-ВО ПОВОРОТОВ\nОГРАНИЧЕННО.\n\nСЧЕТЧИК ПОВОРОТОВ В\nЛЕВОМ ВЕРХНЕМ УГЛУ.`);
		
		await Utils.event_promise(globalThis, "tap gesture");
		
		textTutorial.set_text(`ЗА СБИТОГО ПАУКА\nПОЛУЧИШЬ БОНУС.\n\nНЕ ПОПАДИСЬ В\nПАУТИНУ.\n\n[color=${bottomTextColor}]ДЛЯ ПРОДОЛЖЕНИЯ\nКОСНИСЬ ЭКРАНА.[/color]`);
		
		await Utils.event_promise(globalThis, "tap gesture");
		
		this._show("game");
	}
	
	_create_table_message()
	{
		const th = this._metamorphosis({x: 2, y: 231, w: 1442, h: 1612});
		const table = this.runtime.objects.Sprite_Table.createInstance("hud", th.x, th.y);
		table.setAnimation("message");
		table.animationFrame = 3;
		table.width = th.w;
		table.height = th.h;
		this.objects.push(table);
	}
	
	_check_sdk_loaded()
	{
		if (this.level !== "load_SDK") return;
		
		if (this.common.b_accessDenied)
		{
			this._show("access denied");
			
			return;
		}
		
		if (!this.common.gameScore.b_SDKLoaded) return;
		
		this._add_listeners_game_score();
		
		this._show("main");
	}
	
	_add_listeners_game_score()
	{
		const gs = this.common.gameScore.gs;
		
		if (gs === null) return; //@task. тут мне надо смотреть на b_debug в game_score.json, а не на nill.
		
		gs.player.on("sync", success => {
			console.log('[game score]: sync', success);
			
			if (success === true)
			{
				if (this.callback === null) return; //@bugfix #2.
				
				this.callback();
				this.callback = null;
			}
			else
			{
				this._show("error", {textFirst: `Ошибка синхронизации`, textSecond: `Необходимо повторить синхронизацию, чтобы сохранить текущий прогресс`, buttonName: "again sync", textButton: `Повторить`, buttonCallback: () => {
					this._show("sync");
				}});
			}
		});
		
		gs.payments.on("error:purchase", error => {
			console.warn(`[game score]: error purchase`, error);
			
			let errorNumber = 0;
			let textSecond = ``;
			switch (error)
			{
				case "player_not_found":
				{
					errorNumber = 1;
					textSecond = `player_not_found`;
					break;
				}
				
				case "empty_id_or_tag":
				{
					errorNumber = 2;
					textSecond = `empty_id_or_tag`;
					break;
				}
				
				case "product_not_found":
				{
					errorNumber = 3;
					textSecond = `product_not_found`;
					break;
				}
				
				case "purchases_not_alloved_on_platform":
				{
					errorNumber = 4;
					textSecond = `purchases_not_alloved_on_platform`;
					break;
				}
				case undefined:
				{
					errorNumber = 5;
					textSecond = `undefined`;
					break;
				}
				
				default:
				{
					switch (error.message)
					{
						case "payment_rejected":
						{
							errorNumber = 6;
							textSecond = `payment_rejected`;
							break;
						}
						default:
						{
							console.log('error.message', error.message);
							
							errorNumber = 7;
							textSecond = `${error.message}`;
						}
					}
				}
			}
			
			this._show("error", {textFirst: `Покупка не удалась\nОшибка №${errorNumber}`, textSecond, buttonName: "return before error purchase", textButton: `Понятно`, buttonCallback: () => {
				this.callbacks.purchase();
				Utils.dispatch_event("gs purchase", {isSuccess: false});
			}});
		});
		
		gs.payments.on("purchase", result => {
			console.log(`[game score]: purchase`, result["product"], result["purchase"]);
			
			this.common.gameScore.check_remove_ads_and_close_sticky();
			
			this._show("error", {textFirst: `Оплата успешно произведена`, textSecond: `Спасибо, что совершили покупку. Успехов в дальнейшей игре!`, buttonName: "return before success purchase", textButton: `Закрыть`, buttonCallback: () => {
				this._sync(() => this.callbacks.purchase());
				Utils.dispatch_event("gs purchase", {isSuccess: true});
			}});
		});
	}
	
	_create_table_error(options)
	{
		const {animationFrame} = options;
		
		const th = this._metamorphosis({x: 89, y: 464, w: 1308, h: 1376});
		const table = this.runtime.objects.Sprite_Table.createInstance("hud", th.x, th.y);
		table.setAnimation("message");
		table.animationFrame = animationFrame;
		table.width = th.w;
		table.height = th.h;
		this.objects.push(table);
	}
	
	_create_text_title_table_loss(options) //возможно больше не используется.
	{
		const {textFirst, textSecond} = options;
		
		let th = null;
		
		th = this._metamorphosis({x: 291, y: 605, w: 856, h: 272});
		const textTitle = this.runtime.objects.Text_HUD.createInstance("hud", th.x, th.y);
		textTitle.width = th.w;
		textTitle.height = th.h;
		textTitle.text = textFirst;
		textTitle.horizontalAlign = "center";
		textTitle.verticalAlign = "center";
		this.objects.push(textTitle);
		
		th = this._metamorphosis({x: 270, y: 944, w: 896, h: 288});
		const textScore = this.runtime.objects.Text_HUD.createInstance("hud", th.x, th.y);
		textScore.width = th.w;
		textScore.height = th.h;
		textScore.text = textSecond;
		textScore.horizontalAlign = "center";
		textScore.verticalAlign = "center";
		this.objects.push(textScore);
	}
	
	_create_button_yellow(options)
	{
		const {x, y, name, text, buttonCallback=() => null} = options;
		
		const th = this._metamorphosis({x, y, w: 436, h: 232}, true);
		const button = this.runtime.objects.Sprite_Button.createInstance("hud", th.x, th.y);
		this._this_is_button(button, name);
		button.setAnimation("yellow");
		button.width = th.w;
		button.height = th.h;
		button.buttonTap = buttonCallback;
		
		const buttonBBox = button.getBoundingBox();
		const textInstance = this.runtime.objects.Text_HUD.createInstance("hud", buttonBBox.left, buttonBBox.top);
		textInstance.width = button.width;
		textInstance.height = button.height;
		textInstance.text = text;
		textInstance.horizontalAlign = "center";
		textInstance.verticalAlign = "center";
		this.objects.push(textInstance);
	}
	
	_create_button_remove_ads(options)
	{
		if (this.common.gameScore.is_remove_ads_purchased()) return;
		
		const {coords, animationFrame = 0, b_dark = false} = options;
		
		if (b_dark) this._create_dark_remove_ads();
		
		const th = this._metamorphosis(coords, true);
		const buttonRemoveAds = this.runtime.objects.Sprite_Button.createInstance("hud", th.x, th.y);
		this._this_is_button(buttonRemoveAds, "remove ads");
		buttonRemoveAds.setAnimation("remove ads");
		buttonRemoveAds.animationFrame = animationFrame;
		buttonRemoveAds.width = th.w;
		buttonRemoveAds.height = th.h;
		buttonRemoveAds.buttonTap = () => {
			this._click_remove_ads();
		};
		
		const buttonRemoveAdsBBox = buttonRemoveAds.getBoundingBox();
		const textRemoveAds = this.runtime.objects.Text_HUD.createInstance("hud", buttonRemoveAdsBBox.left, buttonRemoveAdsBBox.top);
		textRemoveAds.width = buttonRemoveAds.width;
		textRemoveAds.height = buttonRemoveAds.height;
		textRemoveAds.text = `Убрать\nрекламу`;
		textRemoveAds.horizontalAlign = "center";
		textRemoveAds.verticalAlign = "center";
		this.objects.push(textRemoveAds);
	}
	
	_create_dark_remove_ads() //@task. объединить с нижним методом _create_dark_back_button.
	{
		const th = this._metamorphosis({x: 495, y: 1259, w: 448, h: 206});
		const darkRemoveAds = this.runtime.objects.Sprite_Button.createInstance("hud", th.x, th.y);
		darkRemoveAds.setAnimation("dark");
		darkRemoveAds.width = th.w;
		darkRemoveAds.height = th.h;
		this.objects.push(darkRemoveAds);
	}
	
	_create_dark_back_button(options)
	{
		const {x, y} = options;
		
		const th = this._metamorphosis({x, y, w: 448, h: 206});
		const darkBackButton = this.runtime.objects.Sprite_Button.createInstance("hud", th.x, th.y);
		darkBackButton.setAnimation("dark");
		darkBackButton.width = th.w;
		darkBackButton.height = th.h;
		this.objects.push(darkBackButton);
		
		return darkBackButton;
	}
	
	_create_win_border() //возможно больше не используется.
	{
		let th = null;
		
		th = this._metamorphosis({x: 291, y: 605, w: 856, h: 272});
		const textTitle = this.runtime.objects.Text_HUD.createInstance("hud", th.x, th.y);
		textTitle.width = th.w;
		textTitle.height = th.h;
		textTitle.text = `Победа`;
		textTitle.horizontalAlign = "center";
		textTitle.verticalAlign = "center";
		this.objects.push(textTitle);
		
		th = this._metamorphosis({x: 255, y: 943, w: 925, h: 287}); //на счёт wh не уверен.
		const textScore = this.runtime.objects.Text_HUD.createInstance("hud", th.x, th.y);
		textScore.width = th.w;
		textScore.height = th.h;
		textScore.text = `Набрано очков\n${this.common.game.score}`;
		textScore.horizontalAlign = "center";
		textScore.verticalAlign = "center";
		this.objects.push(textScore);
	}
	
	_create_slider(options)
	{
		const {x, name, b_state, buttonCallback} = options;
		
		let th = null;
		
		const y = 448 * 2;
		
		th = this._metamorphosis({x, y, w: 223 * 2, h: 114 * 2});
		const sliderBack = this.runtime.objects.Sprite_Button.createInstance("hud", th.x, th.y);
		this._this_is_button(sliderBack, name);
		sliderBack.setAnimation("slider back");
		sliderBack.width = th.w;
		sliderBack.height = th.h;
		this.objects.push(sliderBack);
		sliderBack.buttonTap = buttonCallback;
		
		const right = x + 221;
		th = this._metamorphosis({x: b_state ? right : x, y: y - 12, w: 223, h: 228});
		const sliderFront = this.runtime.objects.Sprite_Button.createInstance("hud", th.x, th.y);
		sliderFront.setAnimation(name);
		sliderFront.width = th.w;
		sliderFront.height = th.h;
		this.objects.push(sliderFront);
		
		th = this._metamorphosis({x});
		sliderFront.left = th.x;
		th = this._metamorphosis({x: right});
		sliderFront.right = th.x;
		
		sliderBack.sliderFront = sliderFront;
		
		return sliderBack;
	}
	
	_this_is_button(button, name) //внешний метод.
	{
		button.name = name;
		button.b_enabled = true;
		this.buttons.push(button);
	}
	
	_play_music(playTag)
	{
		if (!this.sound.b_state) return;
		
		if (this.audio === playTag) return;
		
		if (this.audio !== null) this._stop_music();
		
		this.audio = playTag;
		
		if (!this.common.config["b_debug"])
		{
			const names = {
				"game": "JoshWoodward-TheWake-NoVox-08-WaterInTheCreek",
				"menu": "JoshWoodward-OW-NoVox-08-EastSideBar",
			};
			
			this.runtime.callFunction("Play_Music", names[playTag], playTag);
		}
	}
	
	_stop_music()
	{
		this.runtime.callFunction("Stop_Music", this.audio);
		this.audio = null;
	}
	
	_set_slider_vibrate() //@task. можно попробовать засунуть в boxWithTick.
	{
		if (this.is_transition_level("settings")) return;
		
		const vibrate = this.vibrate;
		const slider = vibrate.slider;
		
		vibrate.slider.animationFrame = vibrate.b_state ? 1 : 0;
		
		const sliderFront = slider.sliderFront;
		sliderFront.animationFrame = slider.animationFrame;
		const end = vibrate.b_state ? sliderFront.right : sliderFront.left;
		sliderFront.x = Utils.lerp_dt(sliderFront.x, end, this.sliderSpeed, this.runtime.dt);
	}
	
	_set_slider_sound() //@task. можно попробовать засунуть в boxWithTick.
	{
		if (this.is_transition_level("settings")) return;
		
		const sound = this.sound;
		const slider = sound.slider;
		
		slider.animationFrame = sound.b_state ? 1 : 0;
		
		const sliderFront = slider.sliderFront;
		sliderFront.animationFrame = slider.animationFrame;
		const end = sound.b_state ? sliderFront.right : sliderFront.left;
		sliderFront.x = Utils.lerp_dt(sliderFront.x, end, this.sliderSpeed, this.runtime.dt);
	}
	
	_show_ads_fullscreen(callback)
	{
		this.callbacks.fullscreenClose = callback;
		
		this.common.gameScore.show_ads_fullscreen();
	}
	
	async _show_rewarded_video(callbackIfSuccess, callbackElse)
	{
		console.log('rewarded video:', this.common.gameScore.gs.ads.isRewardedAvailable); //@debug.
		const success = await this.common.gameScore.show_rewarded_video();
		
		if (success) callbackIfSuccess();
		else
		{
			console.warn('[game score]:', 'ads was overlooked.');
			callbackElse();
		}
	}
	
	_set_button_rewarded_video(button)
	{
		button.saveName = button.name;
		button.saveButtonTap = button.buttonTap;
		
		const boxWithTick = new BoxWithTick();
		
		boxWithTick.append(button, () => {
			const b_available = this.common.gameScore.is_rewarded_video_available();
			button.name = b_available ? button.saveName : "";
			button.isVisible = b_available;
			button.buttonTap = b_available ? button.saveButtonTap : undefined;
		});
	}
	
	_push_score()
	{
		const game = this.common.game;
		
		if (game.score === 0) return false;
		
		this.common.gameScore.add_score(game.score);
		game.score = 0;
		
		return true;
	}
	
	_sync(callback)
	{
		this.callback = callback;
		
		this._show("sync");
	}
	
	_push_score_and_show_fullscreen_ads_and_move_to_game(opts)
	{
		const {b_win} = opts;
		
		const callback = () => this._show_ads_fullscreen(() => {
			this.b_startGame = false;
			
			this.common.game.destroy();
			
			if (b_win) this._show("hives");
			else this._show("game");
		});
		
		this._push_score() === true ? this._sync(callback) : callback();
	}
	
	_get_score_retention_rate() //вроде не используется.
	{
		const common = this.common;
		const arr = common.config["score retention rate"];
		const index = common.game.scoreRetentionRateIndex;
		return arr[Math.min(index, arr.length - 1)] * 100;
	}
	
	_set_score_retention_rate()
	{
		const common = this.common;
		const arr = common.config["score retention rate"];
		const game = common.game;
		const index = game.scoreRetentionRateIndex;
		
		const k = arr[Math.min(index, arr.length - 1)];
		
		game.score *= k;
		
		game.score = Math.ceil(game.score);
		
		game.scoreRetentionRateIndex++;
	}
	
	_click_remove_ads()
	{
		const gameScore = this.common.gameScore;
		
		//if (gameScore.b_debug) return; //а это тут нужно?
		
		const level = this.level;
		const callback = () => this._show(level);
		
		if (gameScore.is_payments_available()) //вот это надо бы перенести внутрь окна purchase, чтобы не дублировать проверку на возможность платежей.
		{
			this._show("purchase", {callback, item: "remove ads"});
		}
		else
		{
			this.callbacks.purchaseUnavailable = callback;
			
			this._show("error", {textFirst: `Платежи не поддерживаются`, textSecond: `Платежи не поддерживаются на данной платформе.`, buttonName: "return before purchase unavailable", textButton: `Закрыть`, buttonCallback: callback});
		}
	}
	
	_create_nectars()
	{
		const nectarsConfig = this.common.config["hud"]["nectar"];
		const coords = nectarsConfig["coords"];
		const moveSpeed = nectarsConfig["move speed"];
		const nectars = [];
		
		coords.forEach(coord => {
			const th = this._metamorphosis({x: coord[0], y: coord[1], w: coord[2], h: coord[3]}, true);
			const nectar = this.runtime.objects.Sprite_Nectar.createInstance("hud", th.x, th.y);
			nectar.width = th.w;
			nectar.height = th.h;
			nectars.push(nectar);
			this.objects.push(nectar);
		});
		
		const boxWithTick = new BoxWithTick();
		
		const offsetSize = nectars[0].width / 6;
		
		const thRange = this._metamorphosis({w: 10}).w;
		const thMoveSpeed = this._metamorphosis({w: moveSpeed}).w;
		
		nectars.forEach(instance => {
			instance.startX = instance.x;
			instance.startY = instance.y;
			instance.nextX = instance.startX;
			instance.nextY = instance.startY;
			instance.t = Math.random();
			instance.nextAngle = Math.random() * Mathutil.TWO_PI;
			instance.currentAngle = Math.random() * Mathutil.TWO_PI;
			instance.isVisible = false;
			instance.instanceVisible = instance.objectType.createInstance(instance.layer.name, instance.x, instance.y);
			instance.addEventListener("destroy", e => instance.instanceVisible.destroy());
			instance.instanceVisible.width = instance.width;
			instance.instanceVisible.height = instance.height;
			instance.timeControl = () => {
				const dt = this.runtime.dt;
				
				instance.t += dt * 1;
				if (instance.t < 1) return;
				
				instance.t %= 1;
				instance.nextX = instance.startX + Mathutil.random(-thRange, thRange);
				instance.nextY = instance.startY + Mathutil.random(-thRange, thRange);
				instance.nextAngle = Mathutil.angleTo(instance.x, instance.y, instance.nextX, instance.nextY);
			};
			instance.move = () => {
				const dt = this.runtime.dt;
				const speed = thMoveSpeed * dt;
				const angleSpeed = Mathutil.toRadians(200) * dt;
				
				instance.x += Math.cos(instance.currentAngle) * speed;
				instance.y += Math.sin(instance.currentAngle) * speed;
				instance.currentAngle = Mathutil.angleRotate(instance.currentAngle, instance.nextAngle, angleSpeed);
			};
			const sol = nectars.filter(inst => inst !== instance);
			instance.bounce = () => {
				const dt = this.runtime.dt;
				const speed = dt * 100;
				let b_result = true;
				for (let i = sol.length - 1; i >= 0; i--)
				{
					const inst = sol[i];
					
					if (Mathutil.distanceTo(instance.x, instance.y, inst.x, inst.y) >= offsetSize) continue;
					
					const angle = Mathutil.angleTo(inst.x, inst.y, instance.x, instance.y);
					instance.x += Math.cos(angle) * speed;
					instance.y += Math.sin(angle) * speed;
					b_result = false;
				}
				return b_result;
			};
			instance.instanceVisible.set_position = () => {
				const lerpSpeed = 0.001;
				const dt = this.runtime.dt;
				instance.instanceVisible.x = Utils.lerp_dt(instance.instanceVisible.x, instance.x, lerpSpeed, dt);
				instance.instanceVisible.y = Utils.lerp_dt(instance.instanceVisible.y, instance.y, lerpSpeed, dt);
			};
			boxWithTick.append(instance, () => {
				instance.bounce();
				instance.timeControl();
				instance.move();
				instance.instanceVisible.set_position();
			});
		});
	}
	
	_create_bee(opts)
	{
		const {x: xOpts, y: yOpts, radius: radiusOpts, direction: directionOpts=1, b_hive=false, sizeFactor=null} = opts;
		
		const boxWithTick = new BoxWithTick();
		
		const radiusOriginal = radiusOpts;
		const th = this._metamorphosis({x: xOpts + radiusOriginal, y: yOpts + radiusOriginal, w: radiusOriginal});
		let x = th.x;
		let y = th.y;
		const radius = th.w;
		const direction = directionOpts;
		
		//@duplicate #1 start.
		const config = this.common.config;
		const configBee = config["bee"];
		const size = sizeFactor === null ? configBee["size"] : sizeFactor;
		const speed = configBee["speed"];
		const smooth = configBee["smooth"];
		const configWings = configBee["wings"];
		const wingsSpeed = configWings["speed"];
		const wingsOffset = configWings["offset"];
		//@duplicate #1 end.
		const bee = new Bee(this.runtime, {x, y, size, speed, smooth, wingsSpeed, wingsOffset, layer: "hud"}, this.common);
		
		bee.stateForHives = b_hive ? "first" : "";
		bee.oldPosition = 0;
		
		bee.rotate = () => {
			if (bee.stateForHives === "fly") return;
			
			const angle = bee.flowerBeeAngle * direction;
			bee.x = x + (Math.cos(angle) * radius);
			bee.y = y + (Math.sin(angle) * radius);
			bee._add_angle(radius);
			bee.moveAngle = Mathutil.angleTo(x, y, bee.x, bee.y) + ((Math.PI / 2) * direction);
			bee._set_sprite_position();
		};
		
		bee.tickStateForHives = () => {
			const state = bee.stateForHives;
			
			const hives = this.runtime.objects.Sprite_Hive.getAllInstances();
			const hive = hives.filter(h => h.b_next)[0];
			
			if (state === "first")
			{
				const newPosition = bee._get_cos_angle(bee.flowerBeeAngle - (Math.PI / 2));
				if ((bee.oldPosition === -1) && (newPosition === 1))
				{
					const angle = Mathutil.angleTo(bee.x, bee.y, hive.x, hive.y);
					
					bee.moveAngle = angle;
					bee.stateForHives = "fly";
					bee.flowerBeeAngle = angle + Math.PI;
				}
				bee.oldPosition = newPosition;
			}
			
			if (state === "fly")
			{
				bee._jump();
				
				const deltaX = bee.x - hive.x;
				const deltaY = bee.y - hive.y;
				const radius = (hive.radius * config["hud"]["hives radius factor"]) + bee.radius;
				if (((deltaX * deltaX) + (deltaY * deltaY)) > (radius * radius)) return;
				
				x = hive.x;
				y = hive.y;
				
				bee.stateForHives = "second";
			}
			
			if (state === "second")
			{
				const newPosition = bee._get_cos_angle(bee.flowerBeeAngle - (Math.PI / 2));
				if ((bee.oldPosition === -1) && (newPosition === 1)) bee.stateForHives = "third";
				bee.oldPosition = newPosition;
			}
			
			if (state === "third")
			{
				const newPosition = bee._get_cos_angle(bee.flowerBeeAngle - (Math.PI / 2));
				if ((bee.oldPosition === -1) && (newPosition === 1)) this._show("main");
				bee.oldPosition = newPosition;
			}
		};
		
		boxWithTick.append(bee.sprite, () => {
			bee.rotate();
			
			bee.tickStateForHives();
		});
		
		this.objects.push(bee.sprite);
		bee.wings.forEach(wing => this.objects.push(wing));
		
		bee.sprite.addEventListener("destroy", () => Bee.instances.length = 0);
	}
	
	_create_hives(opts)
	{
		const {b_animation} = opts;
		
		const hudConfig = this.common.config["hud"];
		const hivesCoords = hudConfig["hives coords"];
		const threshold = hudConfig["hives threshold"];
		
		const level = this.common.gameScore.get_player_level();
		let endLevel = level % threshold;
		let floorLevel = Math.floor(level / threshold) * threshold;
		
		if (b_animation)
		{
			if (level === floorLevel)
			{
				endLevel += threshold;
				floorLevel -= threshold;
			}
		}
		
		const track = this.runtime.objects.Sprite_Track.createInstance("hud", this.centerX, this.centerY);
		this.objects.push(track);
		
		function create_bee(opts)
		{
			const {hakunaMatata, x, y} = opts;
			
			hakunaMatata._create_bee({x, y, radius: 73 * 2, direction: -1, b_hive: b_animation, sizeFactor: hakunaMatata.common.config["hud"]["hives bee size factor"]});
		}
		
		hivesCoords.forEach((coord, index) => {
			const textNumber = (index + 1) + floorLevel;
			
			const x = coord[0] * 2;
			const y = coord[1] * 2;
			
			let th = null;
			
			th = this._metamorphosis({x, y, w: 170 * 2, h: 200 * 2}, true);
			const hive = this.runtime.objects.Sprite_Hive.createInstance("hud", th.x, th.y);
			hive.setAnimation("menu");
			if (index === endLevel) hive.animationFrame = 1;
			if (index > endLevel) hive.animationFrame = 2;
			hive.width = th.w;
			hive.height = th.h;
			hive.moveAdjacentToInstance(track, true);
			hive.b_next = index === endLevel;
			hive.radius = hive.width / 2;
			this.objects.push(hive);
			
			const hiveBBox = hive.getBoundingBox();
			
			th = this._metamorphosis({h: 30 * 2});
			const textInstance = this.runtime.objects.Text_HUD.createInstance("hud", hiveBBox.left, hiveBBox.top + th.h);
			textInstance.width = hive.width;
			textInstance.height = hive.height - th.h;
			textInstance.text = `${textNumber}`;
			textInstance.horizontalAlign = "center";
			textInstance.verticalAlign = "center";
			if (index < endLevel) textInstance.fontColor = [52, 18, 12].map(color => color / 255);
			textInstance.fontFace = this.fonts["ubuntu-bold"];
			textInstance.sizePt = this.get_text_size_pt(56 * 2);
			this.objects.push(textInstance);
			
			if (b_animation)
			{
				if (index === (endLevel - 1)) create_bee({hakunaMatata: this, x, y});
			}
			else
			{
				if (index === endLevel) create_bee({hakunaMatata: this, x, y});
			}
		});
	}
	
	_print_level()
	{
		const level = this.common.gameScore.get_player_level();
		console.log('Level', level, `(${level + 1})`);
	}
	
	_play_button_animation(button)
	{
		const name = button.name;
		
		if (["vibrate", "sound"].includes(name)) return;
		
		const time = 100;
		
		if (button.b_animation)
		{
			button.animationFrame = 1;
			setTimeout(() => {
				try //@bugfix #4.
				{
					button.animationFrame = 0;
				}
				catch
				{
					console.log('catch bugfix #4');
				}
			}, time);
		}
		else
		{
			const brightness = button.brightness;
			
			if (brightness === undefined) return;
			
			brightness.isActive = true;
			brightness.setParameter(0, 0.9);
			const th = this._metamorphosis({h: 6 * 2});
			button.y += th.h;
			setTimeout(() => {
				try //@bugfix #4.
				{
					brightness.isActive = false;
					button.y -= th.h;
				}
				catch
				{
					console.log('catch bugfix #4');
				}
			}, time);
		}
	}
	
	_create_button_settings(opts={})
	{
		const {buttonCallback=() => this._show("settings")} = opts;
		
		const th = this._metamorphosis({x: 16 * 2, y: 1114 * 2, w: 150 * 2, h: 150 * 2}, true);
		const buttonSettings = this.runtime.objects.Sprite_Button.createInstance("hud", th.x, th.y);
		this._this_is_button(buttonSettings, "settings");
		buttonSettings.b_animation = true;
		buttonSettings.setAnimation("settings");
		buttonSettings.width = th.w;
		buttonSettings.height = th.h;
		buttonSettings.buttonTap = buttonCallback;
		
		this.buttonSettings = buttonSettings;
	}
	
	_purchase_boost(callbackIfSuccess, callbackElse)
	{
		console.log('_purchase_boost');
		
		if (this.common.gameScore.is_payments_available())
		{
			this._show("purchase", {callback: callbackIfSuccess, item: "boost"});
		}
		else
		{
			this.callbacks.purchaseUnavailable = callbackElse;
			
			this._show("error", {textFirst: `Платежи не поддерживаются`, textSecond: `Платежи не поддерживаются на данной платформе.`, buttonName: "return before purchase unavailable", textButton: `Закрыть`, buttonCallback: () => {
				this.callbacks.purchaseUnavailable();
			}});
		}
	}
	
	_purchase_ressurection(callbackIfSuccess, callbackElse)
	{
		console.log('_purchase_ressurection');
		
		if (this.common.gameScore.is_payments_available())
		{
			this._show("purchase", {callback: callbackIfSuccess, item: "ressurection"});
		}
		else
		{
			this.callbacks.purchaseUnavailable = callbackElse;
			
			this._show("error", {textFirst: `Платежи не поддерживаются`, textSecond: `Платежи не поддерживаются на данной платформе.`, buttonName: "return before purchase unavailable", textButton: `Закрыть`, buttonCallback: () => {
				this.callbacks.purchaseUnavailable();
			}});
		}
	}
	
	_show_tutorial()
	{
		if (this.isShowTutorial) return;
		
		if (this.common.gameScore.get_player_score() > 0) return;
		
		this._show("tutorial");
		
		this.isShowTutorial = true;
	}
}

class Leaderboard
{
	constructor(hud)
	{
		this.hud = hud;
		this.runtime = this.hud.runtime;
		
		this.loadNumber = 0;
		
		this.b_needUpdate = true;
		this.leaderboard = [];
	}
	
	async create_players()
	{
		const loadNumber = ++this.loadNumber;
		
		await this._request_leaderboard();
		
		if (this.hud.level !== "rating") return;
		
		if (loadNumber !== this.loadNumber) return;
		
		const players = this.leaderboard["players"];
		
		const leaderboardConfig = this.hud.common.config["leaderboard"];
		const textHeight = leaderboardConfig["text height"];
		const offsetY = leaderboardConfig["offset y"];
		
		const gameScore = this.hud.common.gameScore;
		const maxPlayers = gameScore.gameScoreConfig["leaderboard"]["limit"];
		const playerId = gameScore.get_player_id();
		
		const sol = [...players];
		
		this._crop_players(sol, players, maxPlayers);
		
		sol.forEach((player, index) => {
			this._create_text_line({
				index,
				y: (index * textHeight) + offsetY,
				position: player["position"],
				name: player["name"] === "" ? player["id"] : player["name"],
				score: player["score"],
				avatar: player["avatar"],
				b_select: player["id"] === playerId,
			});
		});
	}
	
	async _request_leaderboard()
	{
		if (!this.b_needUpdate) return;
		
		this.b_needUpdate = false;
		
		this.leaderboard = await this.hud.common.gameScore.get_leaderboard();
	}
	
	_crop_players(sol, players, maxPlayers)
	{
		if (sol.length > maxPlayers)
		{
			sol.length = maxPlayers - 1;
			sol.push(players.at(-1));
		}
		
		return sol;
	}
	
	_create_text_line(options) //вот этот метод походу надо в GUI классе держать, ибо он тут лишний (на что и намекает использование this.gui).
	{
		const {index, y, position, name, score, avatar, b_select} = options;
		
		let th = null;
		
		const textColor = [90, 8, 8].map(color => color / 255);
		const fontFace = this.hud.fonts["ubuntu-medium"];
		const textSize = 12;
		const textHeight = this.hud.common.config["leaderboard"]["text height"];
		const lineLeft = 60 * 2;
		
		th = this.hud._metamorphosis({x: lineLeft, y: y, w: 600 * 2, h: textHeight});
		const line = this.runtime.objects.Sprite_Button.createInstance("hud", th.x, th.y);
		line.setAnimation("rating line");
		if (b_select) line.animationFrame = 1;
		line.width = th.w;
		line.height = th.h;
		this.hud.objects.push(line);
		
		th = this.hud._metamorphosis({x: lineLeft + (13 * 2), y: y + (28 * 2), w: 80 * 2, h: 40 * 2});
		const textNumber = this.runtime.objects.Text_HUD.createInstance("hud", th.x, th.y);
		textNumber.width = th.w;
		textNumber.height = th.h;
		textNumber.text = `${position}`;
		textNumber.horizontalAlign = "center";
		textNumber.fontColor = textColor;
		textNumber.fontFace = fontFace;
		textNumber.sizePt = this.hud.get_text_size_pt(24 * 2);
		this.hud.objects.push(textNumber);
		
		th = this.hud._metamorphosis({x: lineLeft + (97 * 2), y: y + (7 * 2), w: 83 * 2, h: 83 * 2});
		const avatarImage = this.runtime.objects.Sprite_Avatar.createInstance("hud", th.x, th.y);
		avatarImage.animationFrame = index;
		avatarImage.width = th.w;
		avatarImage.height = th.h;
		this.hud.objects.push(avatarImage);
		if (avatar !== "") this.runtime.callFunction("Load_Avatar", avatarImage.uid, avatar);
		
		const rack = this.runtime.objects.Sprite_Button.createInstance("hud", avatarImage.x, avatarImage.y);
		rack.setAnimation("rating rack");
		rack.animationFrame = line.animationFrame;
		rack.width = avatarImage.w;
		rack.height = avatarImage.h;
		this.hud.objects.push(rack);
		
		th = this.hud._metamorphosis({x: lineLeft + (194 * 2), y: y + (7 * 2), w: 260 * 2, h: 85 * 2});
		const textName = this.runtime.objects.Text_HUD.createInstance("hud", th.x, th.y);
		textName.width = th.w;
		textName.height = th.h;
		textName.text = `${name}`;
		textName.verticalAlign = "center";
		textName.fontColor = textColor;
		textName.fontFace = fontFace;
		textName.sizePt = this.hud.get_text_size_pt(28 * 2);
		const thLineHeight = this.hud._metamorphosis({h: -6 * 2});
		textName.lineHeight = thLineHeight.h;
		this.hud.objects.push(textName);
		
		th = this.hud._metamorphosis({x: lineLeft + (460 * 2), y: y + (28 * 2), w: 100 * 2, h: 40 * 2});
		const textScore = this.runtime.objects.Text_HUD.createInstance("hud", th.x, th.y);
		textScore.width = th.w;
		textScore.height = th.h;
		textScore.text = `${score}`;
		textScore.horizontalAlign = "right";
		textScore.fontColor = textColor;
		textScore.fontFace = fontFace;
		textScore.sizePt = this.hud.get_text_size_pt(24 * 2);
		this.hud.objects.push(textScore);
	}
}

class Loader
{
	constructor(runtime, common)
	{
		this.runtime = runtime;
		this.common = common;
		
		globalThis.addEventListener("image loading complete", () => {
			console.log('Image loading complete.', this.stage);
			this._load_images();
		});
		
		this.stage = 0;
		
		setTimeout(() => this._load_images(), 0); //специально поставил задержку, чтобы отпустить экран после экрана стандартного загрузчика, чтобы не висел долго чёрный экран.
	}
	
	_load_images()
	{
		switch (this.stage)
		{
			case 0: this._load_textures(); break;
			case 1: this._load_textures(); break;
			case 2: 
			{
				const objectNames = [...this._get_object_names(0), ...this._get_object_names(1)];
				
				const objectNamesExtra = [
					"Text_HUD",
					"Text",
					"Sprite_Collision_Mask",
					"Sprite_Avatar",
				];
				
				Utils.print_unloaded_objects(objectNames, this.runtime.objects, objectNamesExtra);
				
				break;
			}
		}
		
		this.stage++;
	}
	
	_load_textures()
	{
		console.log('Load textures...', this.stage + 1);
		
		Utils.load_images(this._get_object_names(this.stage), this.runtime, false);
	}
	
	_get_object_names(index) //@task. вынести в loader.json.
	{
		const names = [
			[
				"Sprite_Background",
				"Sprite_Button",
				"Sprite_Table",
				"TiledBackground_Mask",
			],
			[
				"Sprite_Track",
				"Sprite_Flower",
				"Sprite_Spider",
				"Sprite_Spider_Paw",
				"Sprite_Bee",
				"Sprite_Wing",
				"Sprite_Nectar",
				"Sprite_Hive",
				"Sprite_Arrow",
				"Sprite_Panel_Tutorial",
			],
		];
		
		return names[index];
	}
}

class Web
{
	constructor(runtime, common, options)
	{
		Web.instances.push(this);
		
		this.runtime = runtime;
		this.common = common;
		
		const {x, y, size, side, config} = options;
		
		this.side = side;
		this.nextFlower = null;
		this.paws = [];
		this.config = config;
		
		this._create_sprite(x, y, size);
		this._create_spider(x, y, size);
		
		this.radius = this.sprite.width / 2;
		
		this.b_spiderDamage = false;
		this.vectorY = 0;
		
		if (this.common.game.is_there_modifier_on_level("spider crazy")) this._change_crazy();
	}
	
	destroy()
	{
		this.sprite.destroy();
		this.spiderWebSprite.destroy();
		this.spiderBodySprite.destroy();
		this.spiderHeadSprite.destroy();
		this.paws.forEach(paw => paw.destroy());
	}
	
	tick()
	{
		this._check_spider_damage();
		
		this._set_paws_angle();
		this._set_head_angle();
	}
	
	set_x(x)
	{
		const offsetX = x - this.sprite.x;
		
		this.sprite.x = x;
		this.spiderWebSprite.x += offsetX;
		this.spiderBodySprite.x += offsetX;
		this.spiderHeadSprite.x += offsetX;
		this.paws.forEach(paw => paw.x += offsetX);
	}
	
	set_flower(flower)
	{
		this.nextFlower = flower;
	}
	
	spider_damage()
	{
		this.b_spiderDamage = true;
	}
	
	_create_sprite(x, y, size)
	{
		const sprite = this.runtime.objects.Sprite_Spider.createInstance("middleground", x, y);
		this.sprite = sprite;
		sprite.setAnimation("web");
		sprite.width *= size;
		sprite.height *= size;
	}
	
	_create_spider(x, y, size)
	{
		const endY = y - (this.sprite.height / 2);
		
		const spiderWebSprite = this.runtime.objects.Sprite_Spider.createInstance("middleground", x, endY);
		this.spiderWebSprite = spiderWebSprite;
		spiderWebSprite.setAnimation("spider");
		spiderWebSprite.animationFrame = 0;
		spiderWebSprite.width *= size;
		spiderWebSprite.height *= size;
		
		this._create_paws(spiderWebSprite.x, spiderWebSprite.y, size);
		
		const spiderBodySprite = this.runtime.objects.Sprite_Spider.createInstance("middleground", x - (2 * size), endY - (100 * size));
		this.spiderBodySprite = spiderBodySprite;
		spiderBodySprite.setAnimation("spider");
		spiderBodySprite.animationFrame = 1;
		spiderBodySprite.width *= size;
		spiderBodySprite.height *= size;
		
		const spiderHeadSprite = this.runtime.objects.Sprite_Spider.createInstance("middleground", x, endY - (26 * size));
		this.spiderHeadSprite = spiderHeadSprite;
		spiderHeadSprite.setAnimation("spider");
		spiderHeadSprite.animationFrame = 2;
		spiderHeadSprite.width *= size;
		spiderHeadSprite.height *= size;
	}
	
	_create_paws(x, y, size)
	{
		const runtime = this.runtime;
		
		const pawsRightCoords = [
			{x: 60, y: -120, a: 356},
			{x: 80, y: -110, a: 358},
			{x: 96, y: -64, a: 0},
			{x: 54, y: -66, a: 2}
		];

		const pawsLeftCoords = [
			{x: -60, y: -120, a: 4},
			{x: -80, y: -110, a: 2},
			{x: -96, y: -64, a: 0},
			{x: -54, y: -66, a: 358}
		];

		function create_paws(coords, animation)
		{
			const paws = [];
			
			coords.forEach((pawCoord, index) => {
				const paw = runtime.objects.Sprite_Spider_Paw.createInstance("middleground", x + (pawCoord.x * size), y + (pawCoord.y * size));
				paw.angleDegrees = pawCoord.a;
				paw.startAngleDegrees = paw.angleDegrees;
				paw.setAnimation(animation);
				paw.animationFrame = (paw.animation.frameCount - 1) - index;
				paw.width *= size;
				paw.height *= size;
				paws.push(paw);
			});
			
			return paws;
		}
		
		this.paws.push(...create_paws(pawsRightCoords, "right"), ...create_paws(pawsLeftCoords, "left"));
	}
	
	_set_paws_angle()
	{
		const pawsConfig = this.config["web"]["paws"];
		const speed = pawsConfig["speed"];
		const offset = pawsConfig["offset"];
		
		const paws = this.paws;
		const sprite = this.sprite;
		const time = this.runtime.gameTime;
		
		const part = 360 / paws[0].animation.frameCount;
		paws.forEach((paw, index) => {
			const val = Math.sin((time * speed) + (index * part));
			paw.angleDegrees = paw.startAngleDegrees + (offset * val);
		});
	}
	
	_set_head_angle()
	{
		const headConfig = this.config["web"]["head"];
		const speed = headConfig["speed"];
		const offset = headConfig["offset"];
		
		const time = this.runtime.gameTime;
		this.spiderHeadSprite.angle = Math.sin(time * speed) * offset;
	}
	
	_change_crazy()
	{
		const spiderCrazyConfig = this.config["web"]["crazy"];
		const sinePeriod = spiderCrazyConfig["sine period"];
		const sineMagnitude = spiderCrazyConfig["sine magnitude"];
		
		const sprite = this.sprite;
		
		sprite.startY = sprite.y;
		sprite.cycle = Math.random();
		
		const boxWithTick = new BoxWithTick();
		boxWithTick.append(this.sprite, () => {
			sprite.y = sprite.startY + (Math.sin((this.runtime.gameTime * sinePeriod) + (sprite.cycle * Mathutil.TWO_PI)) * sineMagnitude);
		});
	}
	
	_check_spider_damage()
	{
		if (!this.b_spiderDamage) return;
		
		const webConfig = this.common.config["web"];
		const gravity = webConfig["gravity"];
		const maxFallSpeed = webConfig["max fall speed"];
		const dt = this.runtime.dt;
		
		this.vectorY += gravity * dt;
		
		if (this.vectorY > maxFallSpeed) this.vectorY = maxFallSpeed;
		
		const speed = this.vectorY * dt;
		
		this.sprite.y += speed;
		this.spiderWebSprite.y += speed;
		this.spiderBodySprite.y += speed;
		this.spiderHeadSprite.y += speed;
		this.paws.forEach(paw => paw.y += speed);
	}
}