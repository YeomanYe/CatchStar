window.onload = game;

var evt = "onorientationchange" in window ? "orientationchange" : "resize";
//移动事件
var touchstartHandler,touchendHandler,restartGameHandler;

window.addEventListener(evt, function() {
    console.log(evt);
    var width = document.documentElement.clientWidth;
    var height = document.documentElement.clientHeight;
    var canvasList = document.getElementsByTagName("canvas");
    if (width > height) {
        for (var i = 0, len = canvasList.length; i < len; i++) {
            canvasList[i].width = width;
            canvasList[i].height = height;
            canvasList[i].style.top = 0;
            canvasList[i].style.left = 0;
            canvasList[i].style.transform = 'none';
            canvasList[i].style.transformOrigin = "50% 50%";
        }
    } else {
        for (var i = 0, len = canvasList.length; i < len; i++) {
            canvasList[i].width = width;
            canvasList[i].height = height;
            canvasList[i].style.top = (height - width) / 2;
            canvasList[i].style.left = (width - height) / 2;
            canvasList[i].style.transform = 'rotate(90deg)';
            canvasList[i].style.transformOrigin = "50% 50%";
        }
    }

}, false);

//ctx1在下
var ctx1, ctx2;
//canvas的宽高
var canWidth, canHeight;
//ground高,位置
var groundHeight, groundY;

var INIT_PLAYER_VX = 0,
    INIT_PLAYER_VY = -18,
    INIT_PLAYER_ACCELX = 0,
    INIT_PLAYER_ACCELY = 1,
    JUMP_TIME = -INIT_PLAYER_VY / INIT_PLAYER_ACCELY,
    PLAYER_JUMP_HEIGHT = -(INIT_PLAYER_VY * JUMP_TIME + JUMP_TIME * JUMP_TIME * INIT_PLAYER_ACCELY / 2);
//最大速度,默认加速度增量   
var MAX_PLAYER_VX = 8,
    DEFAULT_ACCLE_INC = 0.05;
//星星消失速率
var STAR_DEAD_RATE = 0.005;
//分值
var SCORE = 1;
//游戏结束标志位,游戏准备完成标志位
var isOver = false,
    isReady = false;
//设置捕获半径
var PICK_RADIUS = 100;
//屏幕宽高
var screenWidth, screenHeight;

function game() {
    gameInit();
    gameLoop();
}
//音效
var jumpAudio, scoreAudio;
//游戏初始化
function gameInit() {
    var canvas1 = document.getElementById("canvas1"),
        canvas2 = document.getElementById("canvas2");
    ctx1 = canvas1.getContext("2d");
    ctx2 = canvas2.getContext("2d");

    screenWidth = window.innerWidth;
    screenHeight = window.innerHeight;

    var canvasList = document.getElementsByTagName("canvas");
    if (screenWidth < screenHeight) {
        var width = screenWidth,
            height = screenHeight;
        for (var i = 0, len = canvasList.length; i < len; i++) {
            canvasList[i].width = height;
            canvasList[i].height = width;
            canvasList[i].style.marginLeft = (width - height)/2 + "px";
            canvasList[i].style.marginTop = (height - width)/2 + "px";
            // canvasList[i].style.top = (height - width) / 2 + "px";
            // canvasList[i].style.left = (width - height)/2 + "px";
            canvasList[i].style.transform = 'rotate(90deg)';
            canvasList[i].style.transformOrigin = "50% 50%";
        }
    } else {
        canvas1.width = canvas2.width = screenWidth;
        canvas1.height = canvas2.height = screenHeight;
    }




    canWidth = canvas1.offsetWidth;
    canHeight = canvas1.offsetHeight;

    jumpAudio = document.getElementById("jumpAudio");
    scoreAudio = document.getElementById("scoreAudio");

    isReady = false;


    bgImg.src = "images/background.jpg";
    bgImg.onload = function() {
        drawBackground();
        //背景绘制完成后再绘制地
        ground = new groundObj();
        ground.sprite.src = "images/ground.png";
        ground.sprite.onload = function() {
            ground.init();
            ground.draw();

            //绘制角色
            player = new playerObj();
            player.sprite.src = "images/PurpleMonster.png";
            player.sprite.onload = function() {
                player.init();
                player.draw();
                //按下键位增加加速度
                window.onkeydown = function(event) {
                    console.log(event.keyCode);
                    event = event || window.event;
                    var keyCode = event.keyCode;
                    if (keyCode == 65) {
                        player.accelX += -DEFAULT_ACCLE_INC;
                    } else if (keyCode == 68) {
                        player.accelX += DEFAULT_ACCLE_INC;
                    }
                };
                //松开键位加速度归0
                window.onkeyup = function(event) {
                    event = event || window.event;
                    var keyCode = event.keyCode;
                    if (keyCode == 65 || keyCode == 68) {
                        player.accelX = 0;
                    }

                };
                touchstartHandler =  function(event) {
                    event.preventDefault();
                    console.log(event, screenWidth);
                    if (event.touches[0].clientY < screenHeight / 2) {
                        player.accelX += -DEFAULT_ACCLE_INC;
                    } else {
                        player.accelX += DEFAULT_ACCLE_INC;
                    }
                };
                touchendHandler =function(event) {
                    event.preventDefault();
                    player.accelX = 0;
                };
                canvas2.addEventListener("touchstart",touchstartHandler);
                canvas2.addEventListener("touchend", touchendHandler);
                //绘制星星
                star = new starObj();
                star.sprite.src = "images/star.png";
                star.sprite.onload = function() {
                    star.init();
                    star.draw();
                    isReady = true;
                };
            };
        };

        data = new dataObj();
        data.init();
    };
}

function gameLoop() {
    requestAnimFrame(gameLoop);
    if (isReady) {
        ctx2.clearRect(0, 0, canWidth, canHeight);

        player.draw();
        star.draw();
        data.draw();
        if (!isOver) {
            starPlayerCollision();
        } else {
            gameOver();
        }

        //绘制特效
        if (effectStar) {
            effectStar.draw();
            if (effectStar.x[0] == effectStar.x[1]) {
                effectStar = null;
            }
        }
    }
}

/*背景*/
var bgImg = new Image();
//绘制背景
function drawBackground() {
    /*var bgWidth,bgHeight;
    if(screenHeight > screenWidth) {
        ctx1.rotate(Math.PI/180 * 90);
        bgWidth = canWidth;
        bgHeight = canHeight;
        ctx1.drawImage(bgImg, -bgWidth, -bgHeight, bgHeight, bgWidth);
        // ctx1.translate(canWidth/2,canHeight/2);
        ctx1.rotate(Math.PI/180 * 270);
    }else{
        ctx1.drawImage(bgImg, 0, 0, bgWidth, bgHeight);
        bgWidth = canWidth;
        bgHeight = canHeight;
    }*/
    ctx1.drawImage(bgImg, 0, 0, canWidth, canHeight);

}

/*地对象*/
var ground;
var groundObj = function() {
    this.y;
    this.width;
    this.height;
    this.sprite = new Image();
};

groundObj.prototype.init = function() {
    this.y = canHeight * 0.6;
    this.height = canHeight - this.y;
    this.width = canWidth;
};

groundObj.prototype.draw = function() {
    ctx1.drawImage(this.sprite, 0, this.y, this.width, this.height);
};

/*角色对象*/
var player;
var playerObj = function() {
    this.x;
    this.y;
    this.width;
    this.height;
    this.vx;
    this.vy;
    this.accelX;
    this.accelY;
    this.centerX;
    this.centerY;
    this.sprite = new Image();
};

playerObj.prototype.init = function() {
    this.x = (canWidth - this.sprite.width) / 2;
    this.y = ground.y - this.sprite.height;
    this.width = this.sprite.width;
    this.height = this.sprite.height;
    this.vx = INIT_PLAYER_VX;
    this.vy = INIT_PLAYER_VY;
    this.accelX = INIT_PLAYER_ACCELX;
    this.accelY = INIT_PLAYER_ACCELY;

    this.centerX = this.x + this.width / 2;
    this.centerY = this.y + this.height / 2;
};

playerObj.prototype.draw = function() {

    ctx2.drawImage(this.sprite, this.x, this.y + 10, this.width, this.height);

    if (this.y + this.height === ground.y) {
        jumpAudio.play();
    }

    //参数改变
    this.x += this.vx;
    this.y += this.vy;
    this.vx += this.accelX;
    this.vy += this.accelY;

    this.centerX = this.x + this.width / 2;
    this.centerY = this.y + this.height / 2;

    //碰撞检测
    if (this.y + this.height > ground.y) {
        this.y = ground.y - this.height;
        //速度设为相反值
        this.vy = INIT_PLAYER_VY;
    }
    //边界检测
    if (this.x <= 0) {
        this.x = 0;
    } else if (this.x >= ground.width - this.width) {
        this.x = ground.width - this.width;
    }
    //速度检测
    if (this.vx > MAX_PLAYER_VX) {
        this.vx = MAX_PLAYER_VX;
    } else if (this.vx < -MAX_PLAYER_VX) {
        this.vx = -MAX_PLAYER_VX;
    }
};

/*星星对象*/
var star;
var starObj = function() {
    this.x;
    this.y;
    this.width;
    this.height;
    this.sprite = new Image();
    this.opacity;
    this.centerX;
    this.centerY;
};

starObj.prototype.init = function() {
    this.height = this.sprite.height;
    this.width = this.sprite.width;
    this.x = Math.random() * (canWidth - this.width);
    this.y = canHeight - (PLAYER_JUMP_HEIGHT * Math.random() + ground.height + this.height);
    this.opacity = 1;

    this.centerX = this.width / 2 + this.x;
    this.centerY = this.height / 2 + this.y;
};

starObj.prototype.draw = function() {
    ctx2.save();
    ctx2.globalAlpha = this.opacity;
    ctx2.drawImage(this.sprite, this.x, this.y, this.width, this.height);
    ctx2.restore();

    this.opacity -= STAR_DEAD_RATE;
    if (this.opacity <= 0) {
        this.opacity = 0;
        isOver = true;
    }
};

//星星,角色碰撞判定
function starPlayerCollision() {
    if (PICK_RADIUS > getDest(star.centerX, star.centerY, player.centerX, player.centerY)) {
        //碰撞特效
        effectStar = new effectStarObj();
        effectStar.init(star.centerX, star.centerY);
        //得分音效
        scoreAudio.play();
        data.num++;
        star.init();
    }
}

/*数据对象*/
var data;
var dataObj = function() {
    this.num;
};

dataObj.prototype.init = function() {
    this.num = 0;
};

dataObj.prototype.draw = function() {
    ctx2.font = "50px Arial";
    ctx2.fillStyle = "white";
    ctx2.fillText("Score:" + (data.num * SCORE), canWidth * 0.5 - 15 * 5, 50);
};

function gameOver() {
    ctx2.font = "50px Arial";
    ctx2.fillStyle = "white";
    ctx2.fillText("Game Over", canWidth * 0.5 - 15 * 8, canHeight * 0.4);
    ctx2.fillText("Click to restar", canWidth * 0.5 - 15 * 10, canHeight * 0.5);
    window.onkeyup = null;
    window.onkeydown = null;
    
    var canvas2 = document.getElementById("canvas2");
    canvas2.removeEventListener("touchstart",touchstartHandler);
    canvas2.removeEventListener("touchend",touchendHandler);

    //点击重开游戏
    canvas2.style.cursor = "pointer";
    /*    canvas2.onclick = function() {
            isOver = false;
            canvas2.style.cursor = "default";
            gameInit();
            canvas2.onclick = null;
            canvas2.ontouchend = null;
        };*/
    if(restartGameHandler){
        canvas2.removeEventListener("click", restartGameHandler);
        canvas2.removeEventListener("touchend", restartGameHandler);
    }
    restartGameHandler = function(event) {
        event.preventDefault();
        console.log("ontouchend")
        isOver = false;
        canvas2.style.cursor = "default";
        gameInit();
        canvas2.removeEventListener("click", restartGameHandler);
        canvas2.removeEventListener("touchend", restartGameHandler);
    }
    canvas2.addEventListener("click", restartGameHandler);
    canvas2.addEventListener("touchend", restartGameHandler);
    //绘制星星
    star = new starObj();
    star.sprite.src = "images/star.png";
    star.sprite.onload = function() {
        star.init();
        star.draw();
        isReady = true;
    };
}

/*星星爆炸特效*/
var effectStar;
var effectStarObj = function() {
    this.x = [];
    this.y = [];
    this.width = 0;
    this.height = 0;
    this.opacity = 1;
};

effectStarObj.prototype.init = function(x, y) {
    for (var i = 0; i < 4; i++) {
        this.x[i] = (x + star.width / 2) - (i % 2 + 1) * star.width / 2;
        this.y[i] = (y + star.height / 2) - star.height;
        if (i >= 2) {
            this.y[i] = (y + star.height / 2) - 1 * star.height / 2;
        }
    }
    this.width = star.width;
    this.height = star.height;
};

effectStarObj.prototype.draw = function() {
    ctx2.save();
    ctx2.globalAlpha = this.opacity;
    for (var i = 0; i < this.x.length; i++) {
        ctx2.drawImage(star.sprite, this.x[i], this.y[i], this.width, this.height);
    }
    ctx2.restore();
    this.opacity -= 0.05;
    this.width -= 1;
    this.height -= 1;
    for (i = 0; i < this.x.length; i++) {
        if (i % 2) {
            this.x[i]++;
        } else {
            this.x[i]--;
        }
        if (i >= 2) {
            this.y[i]--;
        } else {
            this.y[i]++;
        }
    }
};

/*
工具函数
 */
window.requestAnimFrame = (function() {
    return window.requestAnimationFrame || window.webkitRequestAnimationFrame ||
        window.mozRequestAnimationFrame || window.oRequestAnimationFrame || window.msRequestAnimationFrame ||
        function(callback) {
            return window.setTimeout(callback, 1000 / 60);
        };
})();

function getDest(x1, y1, x2, y2) {
    return Math.sqrt((x1 - x2) * (x1 - x2) + (y1 - y2) * (y1 - y2));
}