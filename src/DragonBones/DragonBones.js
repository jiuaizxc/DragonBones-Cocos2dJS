var dragonBones = dragonBones || {};

dragonBones.FT_FRAME = 0;
dragonBones.FT_TRANSFORM_FRAME = 1;

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
});

dragonBones.Point = cc.Class.extend({
	x:0,
	y:0,
});

dragonBones.Matrix = cc.Class.extend({
	a:0,
	b:0,
	c:0,
	d:0,
	tx:0,
	ty:0,
	
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
	
	ator:function(x, y, width, height){
		if (typeof x === "undefined") { x = 0; }
		if (typeof y === "undefined") { y = 0; }
		if (typeof width === "undefined") { width = 0; }
		if (typeof height === "undefined") { height = 0; }
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
	ator:function(){},
	
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
			matrix.a = this.scaleX * cos(this.skewY);
			matrix.b = this.scaleX * sin(this.skewY);
			matrix.c = -this.scaleY * sin(this.skewX);
			matrix.d = this.scaleY * cos(this.skewX);
		}
		else
		{
			matrix.a = cos(this.skewY);
			matrix.b = sin(this.skewY);
			matrix.c = -sin(this.skewX);
			matrix.d = cos(this.skewX);
		}

		matrix.tx = this.x;
		matrix.ty = this.y;
	}

	/*transformWith:function(parent)
	{
		Matrix matrix;
		parent.toMatrix(matrix, true);
		matrix.invert();
		const float x0 = x;
		const float y0 = y;
		x = matrix.a * x0 + matrix.c * y0 + matrix.tx;
		y = matrix.d * y0 + matrix.b * x0 + matrix.ty;
		skewX = formatRadian(skewX - parent.skewX);
		skewY = formatRadian(skewY - parent.skewY);
	}*/
});
/*----------------------------------------------------------------------geoms部分---------------------------------------------------------------*/

/*objects部分*/
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
		if(eventParametersParsed != null) eventParametersParsed = null;
	}
});

dragonBones.TransformFrame = dragonBones.Frame.extend({
	
});

dragonBones.Timeline = cc.Class.extend({
	
});