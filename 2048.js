    var Autoplay = function() {
    	var limitMax = 8192,
    	maxValue = 0,
    	currentMax = 0,
    	maxScore = 0,
    	predict = 3,
    	lastState = "",
    	run = true;

    	var createField = function () {
    		var f = new Array(4);
    		for (var k = 0; k < 4; k++)
    			f[k] = new Array(4);
    		return f;
    	}
    	var weights = (function (mtx) {
    		var x,
    		y,
    		mat = createField();
    		for (x = 0; x < 4; x++)
    			for (y = 0; y < 4; y++)
    				mat[y][x] = Math.pow(2, mtx[x][y]);
    		return mat;
    	})([
    			[0, 1, 2, 3],
    			[7, 6, 5, 4],
    			[8, 9, 10, 11],
    			[15, 14, 13, 12]
    		]);

    	var game = new GameManager(4, KeyboardInputManager, HTMLActuator, LocalScoreManager);

    	var move = function (dir) {
    		game.move(dir);
    		var newState = getField().join(";");
    		var moved = lastState != newState;
    		lastState = newState;
    		return moved;
    	};

    	var start = function (depth) {
    		run = true;
    		maxValue = 0;
    		predict = depth || 3;
    		play();
    	};
    	var stop = function () {
    		run = false;
    	}

    	var play = function () {
    		if (!run)
    			return;
    		if (game.movesAvailable()) {
    			oneStep();
    			setTimeout(play, 1);
    		} else {
    			console.warn("New score:", game.score, "Last highscore:", maxScore);
    			if (maxScore < game.score)
    				maxScore = game.score;
    			currentMax = 0;
    			game.restart();
    			play();
    		}
    	};

    	var oneStep = function () {
    		var k,
    		p = getMoveWeights(getField(), predict);
    		for (k = 0; k < 4; k++)
    			if (move(p[k].d))
    				return;
    	};

    	var sortByWeightDesc = function (a, b) {
    		if (a.w > b.w)
    			return -1;
    		if (a.w < b.w)
    			return 1;
    		return 0;
    	};

    	var getField = function () {
    		var field = createField();
    		game.grid.eachCell(function (x, y, v) {
    			field[x][y] = v && v.value || 0;
    			if (currentMax < field[x][y])
    				currentMax = log2(field[x][y]);
    			if (maxValue < field[x][y]) {
    				maxValue = field[x][y];
    				console.warn("New maximum: ", maxValue);
    				if (maxValue >= limitMax)
    					run = false;
    			}
    		});
    		return field;
    	};

    	var moveField = function (field, dir) { // 0 = up, 1 = right, 2 = down, 3 = left
    		var moved = createField();
    		var x,
    		y,
    		c;
    		if (dir == 0 || dir == 2) {
    			c = collapseField(field, false);
    			if (dir == 0) {
    				c = stackRows(c);
    				for (x = 0; x < 4; x++)
    					for (y = 0; y < 4; y++)
    						moved[x][y] = c[x][y] || 0;
    			} else {
    				c = stackRows(c, true);
    				for (x = 0; x < 4; x++)
    					for (y = 0; y < 4; y++)
    						moved[x][3 - y] = c[x][c[x].length - 1 - y] || 0;
    			}
    		} else {
    			c = collapseField(field, true);
    			if (dir == 3) {
    				c = stackRows(c);
    				for (x = 0; x < 4; x++)
    					for (y = 0; y < 4; y++)
    						moved[x][y] = c[y][x] || 0;
    			} else {
    				c = stackRows(c, true);
    				for (x = 0; x < 4; x++)
    					for (y = 0; y < 4; y++)
    						moved[3 - x][y] = c[y][c[y].length - 1 - x] || 0;
    			}
    		}

    		var worst = 0,
    		wx,
    		wy;
    		for (x = 0; x < 4; x++)
    			for (y = 0; y < 4; y++)
    				if (!moved[x][y] && worst < weights[x][y] && field[x][y] != 2) {
    					worst = weights[x][y];
    					wx = x;
    					wy = y;
    				}
    		if (worst)
    			moved[wx][wy] = 2;

    		return moved;
    	};

    	var log2 = function (a) {
    		return Math.log(a) / Math.log(2);
    	}

    	var correctWeight = function (w) {
    		return w;
    		//return w - (currentMax / 8);
    	};

    	var calcFieldWeight = function (field) {
    		var x,
    		y,
    		w = 0;
    		for (x = 0; x < 4; x++)
    			for (y = 0; y < 4; y++)
    				w += correctWeight(field[x][y]) * weights[x][y];
    		return w;
    	};

    	var collapseField = function (field, horis) {
    		var collapsed = new Array(4);
    		var x,
    		y;
    		if (horis) {
    			for (y = 0; y < 4; y++)
    				for (x = 0; x < 4; x++)
    					if (field[x][y]) {
    						if (!collapsed[y])
    							collapsed[y] = [];
    						collapsed[y].push(field[x][y]);
    					}
    		} else {
    			for (x = 0; x < 4; x++)
    				for (y = 0; y < 4; y++)
    					if (field[x][y]) {
    						if (!collapsed[x])
    							collapsed[x] = [];
    						collapsed[x].push(field[x][y]);
    					}
    		}

    		return collapsed;
    	};

    	var stackRows = function (rows, reverse) {
    		var r,
    		c,
    		l,
    		row,
    		res = [];
    		for (r = 0; r < 4; r++) {
    			res[r] = [];
    			row = rows[r];
    			if (!row)
    				continue;

    			if (reverse)
    				for (c = 0, l = row.length; c < l; c++) {
    					if (c + 1 < l && row[c] == row[c + 1]) {
    						res[r].push(row[c] * 2);
    						c++;
    					} else
    						res[r].push(row[c]);
    				}
    			else
    				for (c = row.length - 1; c >= 0; c--) {
    					if (c - 1 >= 0 && row[c] == row[c - 1]) {
    						res[r].unshift(row[c] * 2);
    						c--;
    					} else
    						res[r].unshift(row[c]);
    				}
    		}

    		return res;
    	};

    	var getMoveWeights = function (field, depth) {
    		var dirs = [];
    		for (var k = 0; k < 4; k++) {
    			dirs[k] = {
    				fld : moveField(field, k),
    				d : k
    			};

    			dirs[k].w = calcFieldWeight(dirs[k].fld);

    			if (depth > 0)
    				dirs[k].w += (getMoveWeights(dirs[k].fld, depth - 1)[0].w * 1);
    		}

    		dirs.sort(sortByWeightDesc);
    		return dirs;
    	};
    	start();
    }
