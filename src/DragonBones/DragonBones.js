var dragonBones = dragonBones || {};

dragonBones.FT_FRAME = 0;
dragonBones.FT_TRANSFORM_FRAME = 1;
dragonBones.NO_TWEEN_EASING = 20.0;
dragonBones.USE_FRAME_TWEEN_EASING = 30.0;

/*----------------------------------------------------------------------animation部分---------------------------------------------------------------*/
dragonBones.WorldClock = cc.Class.extend({
	_dirty:false,
	_isPlaying:false,
	_time:0,
	_timeScale:0,
	_animatableList:null,

	ctor:function(timeScale){
		if(timeScale === undefined) timeScale = 1;
		this._animatableList = [];
		this._isPlaying = true;
		this._time = 0;
		this.setTimeScale(timeScale);
	},

	getTime:function(){
		return this._time;
	},

	getTimeScale:function(){
		return this._timeScale;
	},

	setTimeScale:function(timeScale){
		if (timeScale < 0 || timeScale != this._timeScale) timeScale = 1;
		this._timeScale = timeScale;
	},

	dispose:function(){
		this._animatableList.length = 0;
	},

	contains:function(animatable){
		return this._animatableList.indexOf(animatable) >= 0;
	},

	add:function(animatable){
		if(animatable != null && this._animatableList.indexOf(animatable) == -1){
			this._animatableList.push(animatable);
		}
	},

	remove:function(animatable){
		var index = this._animatableList.indexOf(animatable);
		if(index >= 0){
			this._animatableList[index] = null;
			this._dirty = true;
		}
	},

	removeAll:function(){
		this._animatableList.length = 0;
	},

	play:function(){
		this._isPlaying = true;
	},

	stop:function(){
		this._isPlaying = false;
	},

	advanceTime:function(passedTime){
		if (!_isPlaying){
			return;
		}

		if (passedTime < 0){
			passedTime = 0;
		}

		passedTime *= this._timeScale;
		this._time += passedTime;

		var len = this._animatableList.length;
		if(len == 0){
			return;
		}

		var animatable;
		var i;
		for(i = 0; i < len; i++){
			animatable = this._animatableList[i];
			if(animatable != null){
				animatable.advanceTime(passedTime);
			}
		}

		if(this._dirty){
			var curIdx = 0;
			len = this._animatableList.length;
			for (i = 0; i < len; i++)
			{
				animatable = this._animatableList[i];
				if (animatable != null)
				{
					if (curIdx != i)
					{
						this._animatableList[curIdx] = animatable;
						this._animatableList[i] = null;
					}
					curIdx++;
				}
			}
			this._animatableList.length = curIdx;
			this._dirty = false;
		}
	}
});
dragonBones.WorldClock._instance = null;
dragonBones.WorldClock.getInstance = function(){
	if(dragonBones.WorldClock._instance == null){
		dragonBones.WorldClock._instance = new dragonBones.WorldClock();
	}
	return dragonBones.WorldClock._instance;
};

dragonBones.AnimationFadeOutMode = {
		NONE:0,
		SAME_LAYER:1,
		SAME_GROUP:2,
		SAME_LAYER_AND_GROUP:3,
		ALL:4
};

dragonBones.Animation = cc.Class.extend({
	autoTween:false,

	_isFading:false,
	_isPlaying:false,
	_timeScale:0,

	_animationList:null,
	_animationDataList:null,
	_animationStateList:null,

	_armature:null,
	_lastAnimationState:null,

	ctor:function(){
		this.autoTween = true;
		this._timeScale = 1;

		this._animationList = [];
		this._animationDataList = [];
		this._animationStateList = [];
	},

	getIsPlaying:function(){
		return this._isPlaying && !this.getIsComplete();
	},

	getIsComplete:function(){
		if (this._lastAnimationState){
			if (!this._lastAnimationState._isComplete){
				return false;
			}

			var l = this._animationStateList.length;
			for (var i = 0; i < l; i++){
				if (!this._animationStateList[i]._isComplete){
					return false;
				}
			}
			return true;
		}

		return true;//存在一个问题2.4与3.0不一样
	},

	getAnimationList:function(){
		return this._animationList;
	},

	getLastAnimationState:function(){
		return this._lastAnimationState;
	},

	getTimeScale:function(){
		return this._timeScale;
	},

	setTimeScale:function(timeScale){
		if (timeScale < 0) {
			timeScale = 1;
		}
		this._timeScale = timeScale;
	},

	getAnimationDataList:function(){
		return this._animationDataList;
	},

	setAnimationDataList:function(animationDataList){
		this._animationDataList = animationDataList;
		this._animationList.length = 0;

		var l = this._animationDataList.length;
		for (var i = 0; i < l; i++){
			this._animationList.push(this._animationDataList[i].name);
		}
	},

	dispose:function(){
		this._animationDataList.length = 0;

		var l = this._animationStateList.length;
		for (var i = 0; i < l; i++){
			dragonBones.AnimationState.returnObject(this._animationStateList[i]);
		}

		this._animationStateList.length = 0;
		this._armature = null;
		this._lastAnimationState = null;
	},

	clear:function(){
		this.stop();

		var l = this._animationStateList.length;
		var i;
		for (i = 0; i < l; i++){
			dragonBones.AnimationState.returnObject(this._animationStateList[i]);
		}
		this._animationStateList.length = 0;
		this._lastAnimationState = null;

		l = this._armature._slotList.length;
		var childArmature;
		for (i = 0; i < l; i++){
			childArmature = this._armature._slotList[i].getChildArmature();
			if (childArmature) {
				childArmature.getAnimation().clear();
			}
		}
	},

	gotoAndPlay:function(animationName, fadeInTime, duration, playTimes, layer, group, fadeOutMode, pauseFadeOut, pauseFadeIn){
		if (fadeInTime === undefined) { fadeInTime = -1; }
		if (duration === undefined) { duration = -1; }
		if (playTimes === undefined) { loop = -1; }
		if (layer === undefined) { layer = 0; }
		if (group === undefined) { group = null; }
		if (fadeOutMode === undefined) { fadeOutMode = dragonBones.AnimationFadeOutMode.SAME_LAYER_AND_GROUP; }
		if (pauseFadeOut === undefined) { pauseFadeOut = true; }
		if (pauseFadeIn === undefined) { pauseFadeIn = true; }

		var animationData;
		var i = this._animationDataList.length;
		while(--i >= 0){
			if (this._animationDataList[i].name == animationName){
				animationData = this._animationDataList[i];
				break;
			}
		}

		if (!animationData){
			return null;
		}

		this._isPlaying = true;
		this._isFading = true;

		fadeInTime = fadeInTime < 0 ? (animationData.fadeTime < 0 ? 0.3 : animationData.fadeTime) : fadeInTime;
		if (fadeInTime <= 0) {
			fadeInTime = 0.01;
		}

		var durationScale;
		if (duration < 0) {
			durationScale = animationData.scale < 0 ? 1 : animationData.scale;
		}else{
			durationScale = duration * 1000 / animationData.duration;
		}

		if (durationScale == 0) {
			durationScale = 0.001;
		}

		playTimes = playTimes < 0 ? animationData.playTimes : playTimes;

		var animationState;
		switch (fadeOutMode)
		{
		case dragonBones.AnimationFadeOutMode.NONE:
			break;
		case dragonBones.AnimationFadeOutMode.SAME_LAYER:
			i = this._animationStateList.length;
			while(--i >= 0){
				animationState = this._animationStateList[i];
				if(animationState._layer == layer){
					animationState.fadeOut(fadeInTime, pauseFadeOut);
				}
			}
			break;
		case dragonBones.AnimationFadeOutMode.SAME_GROUP:
			i = this._animationStateList.length;
			while(--i >= 0){
				animationState = this._animationStateList[i];
				if (animationState._group == group){
					animationState.fadeOut(fadeInTime, pauseFadeOut);
				}
			}
			break;
		case dragonBones.AnimationFadeOutMode.ALL:
			i = this._animationStateList.length;
			while(--i >= 0){
				animationState = this._animationStateList[i];
				animationState.fadeOut(fadeInTime, pauseFadeOut);
			}
			break;
		case dragonBones.AnimationFadeOutMode.SAME_LAYER_AND_GROUP:
		default:
			i = this._animationStateList.length;
			while(--i >= 0){
				animationState = this._animationStateList[i];
				if (animationState._layer == layer && animationState._group == group){
					animationState.fadeOut(fadeInTime, pauseFadeOut);
				}
			}
			break;
		}
		
		this._lastAnimationState = dragonBones.AnimationState.borrowObject();
		this._lastAnimationState._layer = layer;
		this._lastAnimationState._group = group;
		this._lastAnimationState.autoTween = autoTween;
		this._lastAnimationState.fadeIn(this._armature, animationData, fadeInTime, 1.f / durationScale, playTimes, pauseFadeIn);
		this.addState(this._lastAnimationState);
		
		var slot;
		i = this._armature.getSlots().length;
		while(--i >= 0){
			slot = _armature.getSlots()[i];
			
			if (slot._childArmature && slot._childArmature._isInheritAnimation &&
					slot._childArmature._animation.hasAnimation(animationName))
			{
				slot._childArmature._animation.gotoAndPlay(animationName, fadeInTime);
			}
		}

		return this._lastAnimationState;
	},

	gotoAndStop:function(animationName, time, normalizedTime, fadeInTime, duration, layer, group, fadeOutMode){
		if (normalizedTime === undefined) { normalizedTime = -1; }
		if (fadeInTime === undefined) { fadeInTime = 0; }
		if (duration === undefined) { duration = -1; }
		if (layer === undefined) { layer = 0; }
		if (group === undefined) { group = null; }
		if (fadeOutMode === undefined) { fadeOutMode = dragonBones.AnimationFadeOutMode.ALL; }
		
		var animationState = this.getState(animationName, layer);
		if (!animationState){
			animationState = this.gotoAndPlay(animationName, fadeInTime, duration, -1, layer, group, fadeOutMode);
		}

		if (normalizedTime >= 0){
			animationState.setCurrentTime(animationState.getTotalTime() * normalizedTime);
		}else{
			animationState.setCurrentTime(time);
		}
		
		animationState.stop();
		return animationState;
	},

	play:function(){
		if (this._animationDataList.length == 0){
			return;
		}

		if (!this._lastAnimationState){
			this.gotoAndPlay(this._animationDataList[0].name);
		}else if (!this._isPlaying){
			this._isPlaying = true;
		}
	},
	
	stop:function(){
		this._isPlaying = false;
	},
	
	advanceTime:function(passedTime){
		if (!this._isPlaying){
			return;
		}
		
		var isFading = false;
		passedTime *= this._timeScale;
		
		var animationState;
		var l = this._animationStateList.length;
		for (var i = 0; i < l; ++i){
			animationState = this._animationStateList[i];
			if (animationState.advanceTime(passedTime))
			{
				this.removeState(animationState);
				--i;
				--l;
			}else if (animationState._fadeState != dragonBones.FadeState.FADE_COMPLETE){
				isFading = true;
			}
		}
		
		this._isFading = isFading;
	},

	hasAnimation:function(animationName){
		var i = this._animationDataList.length;
		while(--i >= 0){
			if (this._animationDataList[i].name == animationName){
				return true;
			}
		}
		return false;
	},
	
	getState:function(name, layer){
		if (layer === undefined) { layer = 0; }
		
		var animationState;
		var i = this._animationStateList.length;
		while(--i >= 0){
			animationState = this._animationStateList[i];
			if (animationState.name == name && animationState._layer == layer){
				return animationState;
			}
		}
		return null;
	},

	addState:function(animationState){
		if(this._animationStateList.indexOf(animationState) == -1){
			this._animationStateList.push(animationState);
		}
	},
	
	removeState:function(animationState){
		var index = this._animationStateList.indexOf(animationState);
		
		if(index >= 0){
			this._animationStateList.splice(index, 1);
			dragonBones.AnimationState.returnObject(animationState);
			
			if (this._lastAnimationState == animationState)
			{
				if (this._animationStateList.length == 0){
					this._lastAnimationState = null;
				}else{
					this._lastAnimationState = this._animationStateList[this._animationStateList.length - 1];
				}
			}
		}
	},
	
	updateAnimationStates:function(){
		var i = this._animationStateList.length;
		while(--i >= 0){
			this._animationStateList[i].updateTimelineStates();
		}
	}

});

/*----------------------------------------------------------------------animation部分---------------------------------------------------------------*/

/*----------------------------------------------------------------------core部分---------------------------------------------------------------*/
dragonBones.DBObject = cc.Class.extend({
	inheritRotation:false,
	inheritScale:false,
	name:null,
	global:null,
	origin:null,
	offset:null,
	globalTransformMatrix:null,
	userData:null,

	_visible:false,
	_armature:null,
	_parent:null,

	ctor:function(){
		this.global = new dragonBones.Transform();
		this.origin = new dragonBones.Transform();
		this.offset = new dragonBones.Transform();
		this.offset.scaleX = this.offset.scaleY = 0;

		this.inheritRotation = true;
		this.inheritScale = true;

		this._visible = true;
		this._globalTransformMatrix = new dragonBones.Matrix();
	},

	getVisible:function () {
		return this._visible;
	},

	setVisible:function (value) {
		this._visible = value;
	},

	setParent:function (value) {
		this._parent = value;
	},

	getParent:function(){
		return this._parent;
	},

	setArmature:function (value) {
		if (this._armature) {
			this._armature.removeDBObject(this);
		}
		this._armature = value;
		if (this._armature) {
			this._armature.addDBObject(this);
		}
	},

	getArmature:function(){
		return this._armature;
	},

	dispose:function(){
		this._parent = null;
		this._armature = null;
		this._globalTransformMatrix = null;
		this.global = null;
		this.origin = null;
		this.offset = null;
		this.userData = null;
	}
});

/*----------------------------------------------------------------------core部分---------------------------------------------------------------*/

/*----------------------------------------------------------------------event部分---------------------------------------------------------------*/
dragonBones.Event = cc.Class.extend({
	type:null,
	target:null,
	ctor:function(type){
		this.type = type;
	}
});

dragonBones.EventDispatcher = cc.Class.extend({
	_listenersMap:null,
	ctor:function(){},

	hasEventListener:function (type) {
		if (this._listenersMap && this._listenersMap[type]) {
			return true;
		}
		return false;
	},

	addEventListener:function (type, listener) {
		if (type && listener) {
			if (!this._listenersMap) {
				this._listenersMap = {};
			}
			var listeners = this._listenersMap[type];
			if (listeners) {
				this.removeEventListener(type, listener);
			}
			if (listeners) {
				listeners.push(listener);
			} else {
				this._listenersMap[type] = [listener];
			}
		}
	},

	removeEventListener:function (type, listener) {
		if (!this._listenersMap || !type || !listener) {
			return;
		}
		var listeners = this._listenersMap[type];
		if (listeners) {
			var length = listeners.length;
			for (var i = 0; i < length; i++) {
				if (listeners[i] == listener) {
					if (length == 1) {
						listeners.length = 0;
						delete this._listenersMap[type];
					} else {
						listeners.splice(i, 1);
					}
				}
			}
		}
	},

	removeAllEventListeners:function (type) {
		if (type) {
			delete this._listenersMap[type];
		} else {
			this._listenersMap = null;
		}
	},

	dispatchEvent:function (event) {
		if (event) {
			var listeners = this._listenersMap[event.type];
			if (listeners) {
				event.target = this;
				var listenersCopy = listeners.concat();
				var length = listeners.length;
				for (var i = 0; i < length; i++) {
					listenersCopy[i](event);
				}
			}
		}
	}
});

dragonBones.AnimationEvent = dragonBones.Event.extend({
	animationState:null,

	ctor:function(type){
		dragonBones.Event.prototype.ctor.call(this, type);
	},

	getAnimationName:function(){
		return this.animationState.name;
	}
});
dragonBones.AnimationEvent.FADE_IN = "fadeIn";
dragonBones.AnimationEvent.FADE_OUT = "fadeOut";
dragonBones.AnimationEvent.START = "start";
dragonBones.AnimationEvent.COMPLETE = "complete";
dragonBones.AnimationEvent.LOOP_COMPLETE = "loopComplete";
dragonBones.AnimationEvent.FADE_IN_COMPLETE = "fadeInComplete";
dragonBones.AnimationEvent.FADE_OUT_COMPLETE = "fadeOutComplete";

dragonBones.ArmatureEvent = dragonBones.Event.extend({
	ctor:function(type){
		dragonBones.Event.prototype.ctor.call(this, type);
	}
});
dragonBones.ArmatureEvent.Z_ORDER_UPDATED = "zOrderUpdated";

dragonBones.FrameEvent = dragonBones.Event.extend({
	frameLabel:null,
	bone:null,
	animationState:null,

	ctor:function(type){
		dragonBones.Event.prototype.ctor.call(this, type);
	}
});
dragonBones.FrameEvent.ANIMATION_FRAME_EVENT = "animationFrameEvent";
dragonBones.FrameEvent.BONE_FRAME_EVENT = "boneFrameEvent";

dragonBones.SoundEvent = dragonBones.Event.extend({
	armature:null,
	animationState:null,
	sound:null,

	ctor:function(type){
		dragonBones.Event.prototype.ctor.call(this, type);
	}
});
dragonBones.SoundEvent.SOUND = "sound";

dragonBones.SoundEventManager = dragonBones.EventDispatcher.extend({
	ctor:function(){
		dragonBones.EventDispatcher.prototype.ctor.call(this);
		if (dragonBones.SoundEventManager._instance) {
			throw new Error("Singleton already constructed!");
		}
	}
});

dragonBones.SoundEventManager._instance = null;
dragonBones.SoundEventManager.getInstance = function(){
	if(dragonBones.SoundEventManager._instance == null){
		dragonBones.SoundEventManager._instance = new dragonBones.SoundEventManager();
	}
	return dragonBones.SoundEventManager._instance;
}
/*----------------------------------------------------------------------event部分---------------------------------------------------------------*/


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
dragonBones.DisplayData.ARMATURE = "armature";
dragonBones.DisplayData.IMAGE = "image";


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