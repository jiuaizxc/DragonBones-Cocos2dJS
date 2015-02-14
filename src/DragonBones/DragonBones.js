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
		return true;
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
			durationScale = duration * 1000 / animationData.duration;//存在问题时间
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

	/** @protected */
	addState:function(animationState){
		if(this._animationStateList.indexOf(animationState) == -1){
			this._animationStateList.push(animationState);
		}
	},

	/** @protected */
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

	/** @protected */
	updateAnimationStates:function(){
		var i = this._animationStateList.length;
		while(--i >= 0){
			this._animationStateList[i].updateTimelineStates();
		}
	}
});

dragonBones.FadeState = {
		FADE_BEFORE:0,
		FADING:1,
		FADE_COMPLETE:2
};

dragonBones.AnimationState = cc.Class.extend({
	additiveBlending:false,
	autoTween:false,
	autoFadeOut:false,
	displayControl:false,
	lastFrameAutoTween:false,
	fadeOutTime:0,
	weight:0,
	name:null,

	_isPlaying:false,
	_isComplete:false,
	_isFadeOut:false,
	_pausePlayheadInFade:false,
	_currentPlayTimes:0,
	_layer:0,
	_playTimes:0,
	_currentTime:0,
	_currentFrameIndex:0,
	_currentFramePosition:0,
	_currentFrameDuration:0,
	_totalTime:0,
	_time:0,
	_timeScale:0,
	_fadeWeight:0,
	_fadeTotalWeight:0,
	_fadeCurrentTime:0,
	_fadeTotalTime:0,
	_fadeBeginTime:0,
	_group:null,
	_fadeState:0,

	_timelineStateList:null,
	_mixingTransforms:null,

	_clip:null,
	_armature:null,

	ctor:function(){
		this._timelineStateList = [];
		this._mixingTransforms = [];
	},

	getIsComplete:function(){
		return this._isComplete;
	},

	getIsPlaying:function(){
		return (this._isPlaying && !this._isComplete);
	},

	getCurrentPlayTimes:function(){
		return this._currentPlayTimes < 0 ? 0 : this._currentPlayTimes;
	},

	getLayer:function(){
		return this._layer;
	},

	getTotalTime:function(){
		return this._totalTime * 0.001;//存在问题
	},

	getCurrentWeight:function(){
		return this._fadeWeight * this.weight;
	},

	getGroup:function(){
		return this._group;
	},

	getClip:function(){
		return this._clip;
	},

	setAdditiveBlending:function(value){
		this.additiveBlending = value;
		return this;
	},

	setAutoFadeOut:function(value, fadeOutTime_){
		if(fadeOutTime_ === undefined){ fadeOutTime_ = -1; }
		this.autoFadeOut = value;
		if (fadeOutTime_ >= 0){
			this.fadeOutTime = fadeOutTime_;
		}
		return this;
	},

	setWeight:function(value){
		this.weight = value;
		return this;
	},

	setFrameTween:function(autoTween_, lastFrameAutoTween_){
		this.autoTween = autoTween_;
		this.lastFrameAutoTween = lastFrameAutoTween_;
		return this;
	},

	getPlayTimes:function(){
		return this._playTimes;
	},

	setPlayTimes:function(playTimes){
		this._playTimes = playTimes;

		if (Math.round(this._totalTime * 0.001 * this._clip.frameRate) < 2){//存在问题
			this._playTimes = playTimes < 0 ? -1 : 1;
		}else{
			this._playTimes = playTimes < 0 ? -playTimes : playTimes;
		}
		this.autoFadeOut = playTimes < 0 ? true : false;
		return this;
	},

	getCurrentTime:function(){
		return this._currentTime < 0 ? 0 : this._currentTime * 0.001;
	},

	setCurrentTime:function(currentTime){
		if (currentTime < 0 || isNaN(currentTime)){//存在问题
			currentTime = 0;
		}

		this._time = currentTime;
		this._currentTime = this._time * 1000;//这里需要int型
		return this;
	},

	getTimeScale:function(){
		return this._timeScale;
	},

	setTimeScale:function(timeScale){
		if (isNaN(timeScale) || timeScale == Infinity || timeScale === undefined){
			timeScale = 1;
		}
		_timeScale = timeScale;
		return this;
	},

	fadeOut:function(fadeTotalTime, pausePlayhead){
		if (!(fadeTotalTime >= 0)){
			fadeTotalTime = 0;
		}
		this._pausePlayheadInFade = pausePlayhead;

		var i;
		var len;
		if (this._isFadeOut){
			if (fadeTotalTime > this._fadeTotalTime / this._timeScale - (this._fadeCurrentTime - this._fadeBeginTime)){
				//如果已经在淡出中，新的淡出需要更长的淡出时间，则忽略
				return this;
			}
		}else{
			len = this._timelineStateList.length;
			i = 0;
			while(i < len){
				this._timelineStateList[i].fadeOut();
				i ++;
			}
		}

		// fade start
		this._isFadeOut = true;
		this._fadeTotalWeight = this._fadeWeight;
		this._fadeState = dragonBones.FadeState.FADE_BEFORE;
		this._fadeBeginTime = this._fadeCurrentTime;
		this._fadeTotalTime = this._fadeTotalWeight >= 0 ? fadeTotalTime * this._timeScale : 0;
		// default
		this.displayControl = false;
		return this;
	},

	play:function(){
		this._isPlaying = true;
		return this;
	},

	stop:function(){
		this._isPlaying = false;
		return this;
	},

	getMixingTransform:function(timelineName){
		return this._mixingTransforms.indexOf(timelineName) >= 0;
	},

	addMixingTransform:function(timelineName, recursive){
		if(recursive === undefined){ recursive = true; }

		if (recursive){
			var currentBone;
			var bone;
			var boneName;
			var boneList = this._armature.getBones();
			var i = boneList.length;
			while(--i >= 0){
				bone = boneList[i];
				boneName = bone.name;
				if(boneName == timelineName){
					currentBone = bone;
				}

				if(currentBone && (currentBone == bone || currentBone.contains(bone))){
					if(this._clip.getTimeline(boneName) && this._mixingTransforms.indexOf(boneName) < 0){
						this._mixingTransforms.push(boneName);
					}
				}
			}
		}else if(this._clip.getTimeline(timelineName)){
			if(this._mixingTransforms.indexOf(timelineName) < 0){
				this._mixingTransforms.push(timelineName);
			}
		}

		this.updateTimelineStates();
		return this;
	},

	removeMixingTransform:function(timelineName, recursive){
		if(recursive === undefined){ recursive = true; }

		var index;
		if (recursive){
			var currentBone;
			var bone;
			var boneName;
			var boneList = this._armature.getBones();
			var i = boneList.length;
			while(--i >= 0){
				bone = boneList[i];
				boneName = bone.name;
				if(boneName == timelineName){
					currentBone = bone;
				}

				if(currentBone && (currentBone == bone || currentBone.contains(bone))){
					index = this._mixingTransforms.indexOf(boneName);
					if(index >= 0){
						this._mixingTransforms.splice(index, 1);
					}
				}
			}
		}else{
			index = this._mixingTransforms.indexOf(boneName);
			if(index >= 0){
				this._mixingTransforms.splice(index, 1);
			}
		}

		this.updateTimelineStates();
		return this;
	},

	removeAllMixingTransform:function(){
		this._mixingTransforms.length = 0;
		this.updateTimelineStates();
		return this;
	},

	/** @private */
	fadeIn:function(armature, clip, fadeTotalTime, timeScale, playTimes, pausePlayhead){
		this._armature = armature;
		this._clip = clip;
		this._pausePlayheadInFade = pausePlayhead;
		this._totalTime = clip.duration;
		this.autoTween = clip.autoTween;
		this.name = clip.name;
		this.setTimeScale(timeScale);
		this.setPlayTimes(playTimes);
		// reset
		this._isComplete = false;
		this._currentFrameIndex = -1;
		this._currentPlayTimes = -1;

		if (Math.round(this._totalTime * 0.001 * this._clip.frameRate) < 2 || timeScale == Infinity){//存在问题
			this._currentTime = this._totalTime;
		}else{
			this._currentTime = -1;
		}

		this._time = 0;
		this._mixingTransforms.length = 0;
		// fade start
		this._isFadeOut = false;
		this._fadeWeight = 0;
		this._fadeTotalWeight = 1;
		this._fadeCurrentTime = 0;
		this._fadeBeginTime = this._fadeCurrentTime;
		this._fadeTotalTime = fadeTotalTime * this._timeScale;
		this._fadeState = dragonBones.FadeState.FADE_BEFORE;
		// default
		this._isPlaying = true;
		this.displayControl = true;
		this.lastFrameAutoTween = true;
		this.additiveBlending = false;
		this.weight = 1;
		this.fadeOutTime = fadeTotalTime;
		this.updateTimelineStates();
	},

	/** @private */
	advanceTime:function(passedTime){
		passedTime *= this._timeScale;
		this.advanceFadeTime(passedTime);
		if(this._fadeWeight){
			this.advanceTimelinesTime(passedTime);
		}
		return this._isFadeOut && this._fadeState == 2;//dragonBones.FadeState.FADE_COMPLETE
	},

	/** @private */
	updateTimelineStates:function(){
		var timelineState;
		var i = this._timelineStateList.length;
		var len;
		while(--i >= 0){
			timelineState = this._timelineStateList[i];
			if(!this._armature.getBone(timelineState.name)){
				this.removeTimelineState(timelineState);
			}
		}

		if (this._mixingTransforms.length == 0){
			len = this._clip.timelineList.length;
			i = 0;
			while(i < len){
				this.addTimelineState(this._clip.timelineList[i].name);
				i ++;
			}
		}else{
			i = this._timelineStateList.length;
			while(--i >= 0){
				timelineState = this._timelineStateList[i];
				if(this._mixingTransforms.indexOf(timelineState.name) < 0){
					this.removeTimelineState(timelineState);
				}
			}

			len = this._mixingTransforms.length;
			i = 0;
			while(i < len){
				this.addTimelineState(this._mixingTransforms[i]);
				i ++;
			}
		}
	},

	/** @private */
	addTimelineState:function(timelineName){
		var bone = this._armature.getBone(timelineName);
		if (bone){
			var len = this._timelineStateList.length;
			var i = 0;
			while(i < len){
				if (this._timelineStateList[i].name == timelineName){
					return;
				}
				i ++;
			}

			var timelineState = dragonBones.TimelineState.borrowObject();
			timelineState.fadeIn(bone, this, this._clip.getTimeline(timelineName));
			this._timelineStateList.push(timelineState);
		}
	},

	/** @private */
	removeTimelineState:function(timelineState){
		var index = this._timelineStateList.indexOf(timelineState);
		if(index >= 0){
			this._timelineStateList.splice(index, 1);
			dragonBones.TimelineState.returnObject(timelineState);
		}
	},

	/** @private */
	advanceFadeTime:function(passedTime){
		var fadeStartFlg = false;
		var fadeCompleteFlg = false;

		if (this._fadeBeginTime >= 0){
			var fadeState = this._fadeState;
			this._fadeCurrentTime += passedTime < 0 ? -passedTime : passedTime;

			if (this._fadeCurrentTime >= this._fadeBeginTime + this._fadeTotalTime){
				// fade complete
				if (this._fadeWeight == 1 || this._fadeWeight == 0)
				{
					fadeState = 2;//dragonBones.FadeState.FADE_COMPLETE;
					if (this._pausePlayheadInFade){
						this._pausePlayheadInFade = false;
						this._currentTime = -1;
					}
				}
				this._fadeWeight = this._isFadeOut ? 0 : 1;
			}else if (this._fadeCurrentTime >= this._fadeBeginTime){
				// fading
				fadeState = 1;//dragonBones.FadeState.FADING;
				this._fadeWeight = (this._fadeCurrentTime - this._fadeBeginTime) / this._fadeTotalTime * this._fadeTotalWeight;

				if (this._isFadeOut){
					this._fadeWeight = this._fadeTotalWeight - this._fadeWeight;
				}
			}else{
				// fade before
				fadeState = 0;//dragonBones.FadeState.FADE_BEFORE;
				this._fadeWeight = this._isFadeOut ? 1 : 0;
			}

			if(this._fadeState != fadeState){
				// _fadeState == FadeState::FADE_BEFORE && (fadeState == FadeState::FADING || fadeState == FadeState::FADE_COMPLETE)
				if (this._fadeState == 0){//dragonBones.FadeState.FADE_BEFORE
					fadeStartFlg = true;
				}

				// (_fadeState == FadeState::FADE_BEFORE || _fadeState == FadeState::FADING) && fadeState == FadeState::FADE_COMPLETE
				if (fadeState == 2){//dragonBones.FadeState.FADE_COMPLETE
					fadeCompleteFlg = true;
				}
				this._fadeState = fadeState;
			}
		}

		var eventDataType;
		var eventData;

		if (fadeStartFlg)
		{
			if (this._isFadeOut){
				eventDataType = dragonBones.EventType.FADE_OUT;
			}else{
				this.hideBones();
				eventDataType = dragonBones.EventType.FADE_IN;
			}

			if(this._armature._eventDispatcher.hasEvent(eventDataType)){
				eventData = dragonBones.EventData.borrowObject(eventDataType);
				eventData.armature = this._armature;
				eventData.animationState = this;
				this._armature._eventDataList.push(eventData);
			}
		}

		if (fadeCompleteFlg)
		{
			if (this._isFadeOut){
				eventDataType = dragonBones.EventType.FADE_OUT_COMPLETE;
			}else{
				eventDataType = dragonBones.EventType.FADE_IN_COMPLETE;
			}

			if (this._armature._eventDispatcher.hasEvent(eventDataType)){
				eventData = dragonBones.EventData.borrowObject(eventDataType);
				eventData.armature = this._armature;
				eventData.animationState = this;
				this._armature._eventDataList.push(eventData);
			}
		}
	},

	/** @private */
	advanceTimelinesTime:function(passedTime){
		if(this._isPlaying && !this._pausePlayheadInFade){
			this._time += passedTime;
		}

		var startFlg = false;
		var completeFlg = false;
		var loopCompleteFlg = false;
		var isThisComplete = false;
		var currentPlayTimes = 0;
		var currentTime = this._time * 1000;//这里需要int型

		if(_playTimes == 0){
			isThisComplete = false;
			currentPlayTimes = Math.ceil(Math.abs(currentTime) / this._totalTime);//这里需要int型
			currentTime -= Math.floor(currentTime / this._totalTime) * this._totalTime;//这里需要int型
			//currentPlayTimes = (int)(ceil(abs(currentTime) / (float)(_totalTime)));
			//currentTime -= (int)(floor(currentTime / (float)(_totalTime))) * _totalTime;

			if (currentTime < 0){
				currentTime += this._totalTime;
			}
		}else{
			var totalTimes = this._playTimes * this._totalTime;

			if (currentTime >= totalTimes){
				currentTime = totalTimes;
				isThisComplete = true;
			}else if (currentTime <= -totalTimes){
				currentTime = -totalTimes;
				isThisComplete = true;
			}else{
				isThisComplete = false;
			}

			if (currentTime < 0)
			{
				currentTime += totalTimes;
			}

			currentPlayTimes = Math.ceil(currentTime / this._totalTime);//这里需要int型
			currentTime -= Math.floor(currentTime / this._totalTime) * this._totalTime;//这里需要int型
			//currentPlayTimes = (int)(ceil(currentTime / (float)(_totalTime)));
			//currentTime -= (int)(floor(currentTime / (float)(_totalTime))) * _totalTime;

			if (isThisComplete){
				currentTime = this._totalTime;
			}
		}

		if (currentPlayTimes == 0){
			currentPlayTimes = 1;
		}

		this._isComplete = isThisComplete;
		var progress = this._time * 1000 / this._totalTime;//存在问题

		var l = this._timelineStateList.length;
		var i = 0;
		var timeline;
		while(i < l){
			timeline = this._timelineStateList[i];
			timeline.update(progress);
			this._isComplete = timeline._isComplete && this._isComplete;
			i ++;
		}

		// update main timeline
		if(this._currentTime != currentTime){
			if(this._currentPlayTimes != currentPlayTimes){// check loop complete
				if(this._currentPlayTimes > 0 && currentPlayTimes > 1){
					loopCompleteFlg = true;
				}
				this._currentPlayTimes = currentPlayTimes;
			}

			if(_currentTime < 0 && !_pausePlayheadInFade){// check start
				startFlg = true;
			}

			if (this._isComplete){// check complete
				completeFlg = true;
			}
			this._currentTime = currentTime;
			this.updateMainTimeline(isThisComplete);
		}

		var eventData;
		if(startFlg){
			if (this._armature._eventDispatcher.hasEvent(dragonBones.EventType.START)){
				eventData = dragonBones.EventData.borrowObject(dragonBones.EventType.START);
				eventData.armature = this._armature;
				eventData.animationState = this;
				this._armature._eventDataList.push(eventData);
			}
		}

		if(completeFlg){
			if (this._armature._eventDispatcher.hasEvent(dragonBones.EventType.COMPLETE)){
				eventData = dragonBones.EventData.borrowObject(dragonBones.EventType.COMPLETE);
				eventData.armature = _armature;
				eventData.animationState = this;
				this._armature._eventDataList.push(eventData);
			}

			if (this.autoFadeOut){
				fadeOut(this.fadeOutTime, true);
			}
		}else if (loopCompleteFlg){
			if (this._armature._eventDispatcher.hasEvent(dragonBones.EventType.LOOP_COMPLETE)){
				eventData = dragonBones.EventData.borrowObject(dragonBones.EventType.LOOP_COMPLETE);
				eventData.armature = _armature;
				eventData.animationState = this;
				this._armature._eventDataList.push(eventData);
			}
		}
	},

	/** @private */
	updateMainTimeline:function(isThisComplete){//自己修改过代码
		var frameList = this._clip.frameList;
		var l = frameList.length;
		if (l > 0){
			var prevFrame;
			var currentFrame;

			for (var i = 0; i < l; ++i){
				if(this._currentFrameIndex < 0){
					this._currentFrameIndex = 0;
				}else if(this._currentTime < this._currentFramePosition || this._currentTime >= this._currentFramePosition + this._currentFrameDuration){
					++this._currentFrameIndex;

					if(this._currentFrameIndex >= l){
						if (isThisComplete){
							--this._currentFrameIndex;
							break;
						}else{
							this._currentFrameIndex = 0;
						}
					}
				}else{
					break;
				}

				currentFrame = frameList[this._currentFrameIndex];

				if(prevFrame){
					this._armature.arriveAtFrame(prevFrame, this, true);
				}

				this._currentFrameDuration = currentFrame.duration;
				this._currentFramePosition = currentFrame.position;
				prevFrame = currentFrame;
			}

			if(currentFrame){
				this._armature.arriveAtFrame(currentFrame, this, false);
			}
		}
	},

	/** @private */
	hideBones:function(){
		var bone;
		for(var i = 0, l = this._clip.hideTimelineList.length; i < l; i++){
			bone = this._armature.getBone(this._clip.hideTimelineList[i]);
			if (bone){
				bone.hideSlots();
			}
		}
	},

	/** @private */
	clear:function(){
		var i = this._timelineStateList.length;
		while(--i >= 0){
			dragonBones.TimelineState.returnObject(this._timelineStateList[i]);
		}
		this._timelineStateList.length = 0;
		this._mixingTransforms.length = 0;

		this._armature = null;
		this._clip = null;
	}
});

dragonBones.AnimationState._pool = [];
var dbAnimationStatePool = dragonBones.AnimationState._pool;

dragonBones.AnimationState.borrowObject = function(){
	if (dbAnimationStatePool.length == 0){
		return new AnimationState();
	}
	return dbAnimationStatePool.pop();
};

dragonBones.AnimationState.returnObject = function(animationState){
	var index = dbAnimationStatePool.indexOf(animationState);
	if(index < 0){
		dbAnimationStatePool.push(animationState);
	}
	animationState.clear();
};

dragonBones.AnimationState.clearObjects = function(){
	var i = dbAnimationStatePool.length;
	while (--i >= 0) {
		dbAnimationStatePool[i].clear();
	}
	dbAnimationStatePool.length = 0;
};

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