var dragonBones = dragonBones || {};

dragonBones.FT_FRAME = 0;
dragonBones.FT_TRANSFORM_FRAME = 1;
dragonBones.NO_TWEEN_EASING = 20.0;
dragonBones.USE_FRAME_TWEEN_EASING = 30.0;
dragonBones.ARMATURE = "armature";
dragonBones.IMAGE = "image";

/*----------------------------------------------------------------------geoms部分---------------------------------------------------------------*/
dragonBones.ColorTransform = cc.Class.extend({
	alphaMultiplier:1,
	redMultiplier:1,
	greenMultiplier:1,
	blueMultiplier:1,

	alphaOffset:0,
	redOffset:0,
	greenOffset:0,
	blueOffset:0,
	
	ator:function(){}
});

dragonBones.Point = cc.Class.extend({
	x:0,
	y:0,
	
	ctor:function(){}
});

dragonBones.Matrix = cc.Class.extend({
	a:0,
	b:0,
	c:0,
	d:0,
	tx:0,
	ty:0,
	
	ctor:function(){},
	
	invert:function(){
		var a0 = this.a;
		var b0 = this.b;
		var c0 = this.c;
		var d0 = this.d;
		var tx0 = this.tx;
		var ty0 = this.ty;
		var determinant = 1 / (a0 * d0 - b0 * c0);
		
		this.a = determinant * d0;
		this.b = -determinant * b0;
		this.c = -determinant * c0;
		this.d = determinant * a0;
		this.tx = determinant * (c0 * ty0 - d0 * tx0);
		this.ty = determinant * (b0 * tx0 - a0 * ty0);
	},
	
	transformPoint:function(point)
	{
		var x = point.x;
		var y = point.y;
		point.x = this.a * x + this.c * y + this.tx;
		point.y = this.d * y + this.b * x + this.ty;
	}
});

dragonBones.Rectangle = cc.Class.extend({
	x:0,
	y:0,
	width:0,
	height:0,
	
	ctor:function(x, y, width, height){
		if (x === undefined) { x = 0; }
		if (y === undefined) { y = 0; }
		if (width === undefined) { width = 0; }
		if (height === undefined) { height = 0; }
		this.x = x;
		this.y = y;
		this.width = width;
		this.height = height;
	}
});

dragonBones.Transform = cc.Class.extend({
	x:0,
	y:0,
	skewX:0,
	skewY:0,
	scaleX:1,
	scaleY:1,
	
	ctor:function(){},
	
	getRotation:function()
	{
		return this.skewX;
	},
	
	setRotation:function(value)
	{
		this.skewX = this.skewY = value;
	},
	
	toMatrix:function(matrix, keepScale)
	{
		if (keepScale === undefined) keepScale = false;
		if (keepScale)
		{
			matrix.a = this.scaleX * Math.cos(this.skewY);
			matrix.b = this.scaleX * Math.sin(this.skewY);
			matrix.c = -this.scaleY * Math.sin(this.skewX);
			matrix.d = this.scaleY * Math.cos(this.skewX);
		}
		else
		{
			matrix.a = Math.cos(this.skewY);
			matrix.b = Math.sin(this.skewY);
			matrix.c = -Math.sin(this.skewX);
			matrix.d = Math.cos(this.skewX);
		}

		matrix.tx = this.x;
		matrix.ty = this.y;
	},

	/**
	 * @function
	 * @param {dragonBones.Transform}.
	 */
	transformWith:function(parent)
	{
		var matrix = new dragonBones.Matrix();
		parent.toMatrix(matrix, true);
		matrix.invert();
		x0 = this.x;
		y0 = this.y;
		this.x = matrix.a * x0 + matrix.c * y0 + matrix.tx;
		this.y = matrix.d * y0 + matrix.b * x0 + matrix.ty;
		this.skewX = dbutils.TransformUtil.formatRadian(this.skewX - parent.skewX);
		this.skewY = dbutils.TransformUtil.formatRadian(this.skewY - parent.skewY);
	}
});
/*----------------------------------------------------------------------geoms部分---------------------------------------------------------------*/

/*objects部分*/
dragonBones.AnimationData = dragonBones.Timeline.extend({
	autoTween:false,
	frameRate:0,
	playTimes:0,
	fadeTime:0,
	// use frame tweenEase, NaN
	// overwrite frame tweenEase, [-1, 0):ease in, 0:line easing, (0, 1]:ease out, (1, 2]:ease in out
	tweenEasing:0,

	name:null,
	timelineList:null,
	hideTimelineList:null,
	
	ctor:function(){
		dragonBones.Timeline.prototype.ctor.call(this);
		this.frameRate = 30;
		this.playTimes = 1;
		this.tweenEasing = dragonBones.USE_FRAME_TWEEN_EASING;
		
		this.timelineList = {};
		this.hideTimelineList = [];
	},
	
	getTimeline:function (timelineName) {
		return this.timelineList[timelineName];
	},
	
	dispose:function(){
		dragonBones.Timeline.prototype.dispose.call(this);

		for (var timelineName in this.timelineList) {
			(this.timelineList[timelineName]).dispose();
		}
		this.timelineList = null;
	}
});

dragonBones.ArmatureData = cc.Class.extend({
	boneDataList:null,
	skinDataList:null,
	animationDataList:null,
	//（DB#1）缺少碰撞数据
	
	ctor:function(){
		this.boneDataList = [];
		this.skinDataList = [];
		this.animationDataList = [];
	},
	
	dispose:function(){
		var i = this.boneDataList.length;
		while (i--) {
			this.boneDataList[i].dispose();
		}
		i = this.skinDataList.length;
		while (i--) {
			this.skinDataList[i].dispose();
		}
		i = this.animationDataList.length;
		while (i--) {
			this.animationDataList[i].dispose();
		}
		this.boneDataList.length = 0;
		this.skinDataList.length = 0;
		this.animationDataList.length = 0;
		this.boneDataList = null;
		this.skinDataList = null;
		this.animationDataList = null;
	},
	
	getBoneData:function (boneName) {
		var i = this.boneDataList.length;
		while (i--) {
			if (this.boneDataList[i].name == boneName) {
				return this.boneDataList[i];
			}
		}
		return null;
	},

	getSkinData:function (skinName) {
		if (!skinName) {
			return this.skinDataList[0];
		}
		var i = this.skinDataList.length;
		while (i--) {
			if (this.skinDataList[i].name == skinName) {
				return this.skinDataList[i];
			}
		}
		return null;
	},

	getAnimationData:function (animationName) {
		var i = this.animationDataList.length;
		while (i--) {
			if (this.animationDataList[i].name == animationName) {
				return this.animationDataList[i];
			}
		}
		return null;
	},
	
	addBoneData:function (boneData) {
		if (!boneData) {
			throw new Error();
		}

		if (this.boneDataList.indexOf(boneData) < 0) {
			this.boneDataList[this.boneDataList.length] = boneData;
		} else {
			throw new Error();
		}
	},

	addSkinData:function (skinData) {
		if (!skinData) {
			throw new Error();
		}

		if (this.skinDataList.indexOf(skinData) < 0) {
			this.skinDataList[this.skinDataList.length] = skinData;
		} else {
			throw new Error();
		}
	},

	addAnimationData:function (animationData) {
		if (!animationData) {
			throw new Error();
		}

		if (this.animationDataList.indexOf(animationData) < 0) {
			this.animationDataList[this.animationDataList.length] = animationData;
		}
	},
	
	sortBoneDataList:function () {
		var i = this.boneDataList.length;
		if (i == 0) {
			return;
		}

		var helpArray = [];
		while (i--) {
			var boneData = this.boneDataList[i];
			var level = 0;
			var parentData = boneData;
			while (parentData && parentData.parent) {
				level++;
				parentData = this.getBoneData(parentData.parent);
			}
			helpArray[i] = { level: level, boneData: boneData };
		}

		helpArray.sort(this.sortBoneData);

		i = helpArray.length;
		while (i--) {
			this.boneDataList[i] = helpArray[i].boneData;
		}
	},

	sortBoneData:function (object1, object2) {
		return object1.level > object2.level ? 1 : -1;
	}
});

dragonBones.BoneData = cc.Class.extend({
	name:null,
	parent:null,
	length:0,
	
	global:null,
	transform:null,
	
	inheritScale:false,
	inheritRotation:false,
	//（DB#1）缺少碰撞数据
	
	ctor:function(){
		this.length = 0;
		this.global = new dragonBones.Transform();
		this.transform = new dragonBones.Transform();
		this.inheritRotation = true;
	},
	
	dispose:function(){
		this.global = null;
		this.transform = null;
	}
});

dragonBones.DisplayData = cc.Class.extend({
	name:null,
	type:null,
	transform:null,
	pivot:null,

	ctor:function(){
		this.transform = new dragonBones.Transform();
	},

	dispose:function(){
		this.transform = null;
		this.pivot = null;
	}
});

dragonBones.DragonBonesData = cc.Class.extend({
	autoSearch:false,
	name:null,
	armatureDataList:null,
	
	ctor:function(){
		this.armatureDataList = [];
	},
	
	dispose:function(){
		var i = this.armatureDataList.length;
		while (i--) {
			this.armatureDataList[i].dispose();
		}
		this.armatureDataList.length = 0;
		this.armatureDataList = null;
	},
	
	getArmatureData:function(armatureName){
		var i = this.armatureDataList.length;
		while (i--) {
			if (this.armatureDataList[i].name == armatureName) {
				return this.armatureDataList[i];
			}
		}
		return null;
	}
});

dragonBones.Frame = cc.Class.extend(/** @lends dragonBones.Frame# */{
	position:0,
	duration:0,
	frameType:null,
	action:null,
	event:null,
	sound:null,
	eventParameters:null,
	eventParametersParsed:null,
	
	ctor: function(){
		this.frameType = dragonBones.FT_FRAME;
	},
	
	dispose: function(){
		if(this.eventParametersParsed != null) this.eventParametersParsed = null;
	}
});

dragonBones.SkinData = cc.Class.extend({
	name:null,
	slotDataList:null,

	ctor:function(){
		this.slotDataList = [];
	},
	
	dispose:function () {
		var i = this.slotDataList.length;
		while (i--) {
			this.slotDataList[i].dispose();
		}
		this.slotDataList.length = 0;
		this.slotDataList = null;
	},

	getSlotData:function(slotName) {
		var i = this.slotDataList.length;
		while (i--) {
			if (this.slotDataList[i].name == slotName) {
				return this.slotDataList[i];
			}
		}
		return null;
	},

	addSlotData:function (slotData) {
		if (!slotData) {
			throw new Error();
		}

		if (this.slotDataList.indexOf(slotData) < 0) {
			this.slotDataList[this.slotDataList.length] = slotData;
		} else {
			throw new Error();
		}
	}
});

dragonBones.SlotData = cc.Class.extend({
	name:null,
	parent:null,
	zOrder:0,
	blendMode:null,
	displayDataList:null,
	
	ctor:function(){
		this.displayDataList = [];
	},
	
	dispose:function(){
		var i = this.displayDataList.length;
		while (i--) {
			this.displayDataList[i].dispose();
		}
		this.displayDataList.length = 0;
		this.displayDataList = null;
	},
	
	getDisplayData:function (slotName) {
		var i = this.displayDataList.length;
		while (i--) {
			if (this.displayDataList[i].name == slotName) {
				return this.displayDataList[i];
			}
		}
		return null;
	},

	addDisplayData:function (slotData) {
		if (!slotData) {
			throw new Error();
		}

		if (this.displayDataList.indexOf(slotData) < 0) {
			this.displayDataList[this.displayDataList.length] = slotData;
		} else {
			throw new Error();
		}
	}
});

dragonBones.Timeline = cc.Class.extend({
	duration:0,
	scale:0,
	frameList:null,
	
	ctor:function(){
		this.duration = 0;
		this.scale = 1;
		this.frameList = [];
	},
	
	dispose:function(){
		var i = this.frameList.length;
		while (i--) {
			this.frameList[i].dispose();
		}
		this.frameList.length = 0;
		this.frameList = null;
	}
});

dragonBones.TransformFrame = dragonBones.Frame.extend({
	visible:false,
	tweenScale:false,
	tweenRotate:0,
	displayIndex:0,
	zOrder:0,
	// NaN:no tween, 10:auto tween, [-1, 0):ease in, 0:line easing, (0, 1]:ease out, (1, 2]:ease in out
	tweenEasing:0,

	global:null,
	transform:null,
	pivot:null,
	scaleOffset:null,
	color:null,
	
	ctor:function(){
		dragonBones.Frame.prototype.ctor.call(this);
		this.visible = true;
		this.tweenScale = true;
		this.tweenEasing = dragonBones.NO_TWEEN_EASING;
		this.frameType = dragonBones.FT_TRANSFORM_FRAME;
		
		this.global = new dragonBones.Transform();
		this.transform = new dragonBones.Transform();
		this.pivot = new dragonBones.Point();
		this.scaleOffset = new dragonBones.Point();
	},

	dispose:function(){
		dragonBones.Frame.prototype.dispose.call(this);
		this.global = null;
		this.transform = null;
		this.pivot = null;
		this.scaleOffset = null;
		this.color = null;
	}
});

dragonBones.TransformTimeline = dragonBones.Timeline.extend({
	transformed:false,
	offset:0,

	name:null,
	originTransform:null,
	originPivot:null,
	
	ctor:function(){
		dragonBones.Timeline.prototype.ctor.call(this);
		this.originTransform = new dragonBones.Transform();
		this.originPivot = new dragonBones.Point();
	},
	
	dispose:function(){
		dragonBones.Timeline.prototype.dispose.call(this);
		this.originTransform = null;
		this.originPivot = null;
	}
});

/*----------------------------------------------------------------------utils部分---------------------------------------------------------------*/
dragonBones.utils = dragonBones.utils || {};
var dbutils = dragonBones.utils;

dbutils.TransformUtil = {
		DOUBLE_PI:Math.PI * 2,
		_helpMatrix:new dragonBones.Matrix(),

		formatRadian:function (radian){
			radian %= this.DOUBLE_PI;
			if (radian > Math.PI) {
				radian -= this.DOUBLE_PI;
			}
			if (radian < -Math.PI) {
				radian += this.DOUBLE_PI;
			}
			return radian;
		}
};
/*----------------------------------------------------------------------utils部分---------------------------------------------------------------*/