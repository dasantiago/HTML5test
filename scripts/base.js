


	/* Polyfills */

	if (!Function.prototype.bind) {
	  Function.prototype.bind = function (oThis) {
	    if (typeof this !== "function") {
	      // closest thing possible to the ECMAScript 5 internal IsCallable function
	      throw new TypeError("Function.prototype.bind - what is trying to be bound is not callable");
	    }

	    var aArgs = Array.prototype.slice.call(arguments, 1),
	        fToBind = this,
	        fNOP = function () {},
	        fBound = function () {
	          return fToBind.apply(this instanceof fNOP && oThis
	                                 ? this
	                                 : oThis,
	                               aArgs.concat(Array.prototype.slice.call(arguments)));
	        };

	    fNOP.prototype = this.prototype;
	    fBound.prototype = new fNOP();

	    return fBound;
	  };
	}

	(function(win, doc){
		if(win.addEventListener)return;		//No need to polyfill

		function docHijack(p){var old = doc[p];doc[p] = function(v){return addListen(old(v))}}
		function addEvent(on, fn, self){
			return (self = this).attachEvent('on' + on, function(e){
				var e = e || win.event;
				e.preventDefault  = e.preventDefault  || function(){e.returnValue = false}
				e.stopPropagation = e.stopPropagation || function(){e.cancelBubble = true}
				fn.call(self, e);
			});
		}
		function addListen(obj, i){
			if(!obj) return obj;
			if(i = obj.length)while(i--)obj[i].addEventListener = addEvent;
			else obj.addEventListener = addEvent;
			return obj;
		}

		addListen([doc, win]);
		if('Element' in win)win.Element.prototype.addEventListener = addEvent;			//IE8
		else{																			//IE < 8
			doc.attachEvent('onreadystatechange', function(){addListen(doc.all)});		//Make sure we also init at domReady
			docHijack('getElementsByTagName');
			docHijack('getElementById');
			docHijack('createElement');
			addListen(doc.all);
		}
	})(window, document);





	/* Utility functions */

	var tim = (function(){
	    var starts  = "\\{\\{",
	        ends    = "\\}\\}",
	        path    = "[a-z0-9_][\\.a-z0-9_]*", // e.g. config.person.name
	        pattern = new RegExp(starts + "("+ path +")" + ends, "gim"),
	        undef;

	    return function(template, data, notFound){
	        // Merge the data into the template string
	        return template.replace(pattern, function(tag, ref){
	            var path = ref.split("."),
	                len = path.length,
	                lookup = data,
	                i = 0;

	            for (; i < len; i++){
	                lookup = lookup[path[i]];

	                // Error handling for when the property is not found
	                if (lookup === undef){
	                    // If specified, substitute with the "not found" arg
	                    if (notFound !== undef){
	                        return notFound;
	                    }
	                    // Throw error
	                    throw "Tim: '" + path[i] + "' not found in " + tag;
	                }

	                // Success! Return the required value
	                if (i === len - 1){
	                    return lookup;
	                }
	            }
	        });
	    };
	}());

	function escapeSlashes(string) {
		return string.replace(/\\/g, '\\\\').
			replace(/\u0008/g, '\\b').
			replace(/\t/g, '\\t').
			replace(/\n/g, '\\n').
			replace(/\f/g, '\\f').
			replace(/\r/g, '\\r').
			replace(/'/g, '\\\'').
			replace(/"/g, '\\"');
	}


	var NO = 0,
		YES = 1,
		OLD = 2,
		BUGGY = 4,
		PREFIX = 8,
		BLOCKED = 16,
		DISABLED = 32,
		UNCONFIRMED = 64,
		UNKNOWN = 128,
		EXPERIMENTAL = 256;



	var Metadata = function() { this.initialize.apply(this, arguments) };
	Metadata.prototype = {
		initialize: function(data) {
			this.data = data;
			this.list = {};

			for (var i = 0; i < this.data.length; i++) {
				this.iterate(this.data[i].items, '', -1, []);
			}
		},

		iterate: function(data, prefix, level, path) {
			for (var i = 0; i < data.length; i++) {
				var key;

				if (typeof data[i].id != 'undefined') {
					key = prefix + (prefix == '' ? '' : '.') + data[i].id;
				}

				if (typeof data[i].key != 'undefined') {
					key = data[i].key;
				}

				if (key) {
					path[level + 1] = key;

					if (typeof data[i].key == 'undefined') {
						data[i].key = key;
					}

					if (typeof data[i].name != 'undefined') {
						this.list[key] = {
							name: data[i].name,
							path: path.slice(0, level + 1)
						};
					}

					if (typeof data[i].items != 'undefined') {
						this.iterate(data[i].items, key, level + 1, path);
					}
				}
			}
		},

		getItem: function(key) {
			var item = this.list[key];
			return item;
		},

		getTrail: function(key, separator) {
			var item = this.list[key];

			if (item) {
				var trail = [];

				for (var i = 0; i < item.path.length; i++) {
					if (typeof this.list[item.path[i]] != 'undefined') {
						trail.push(this.list[item.path[i]].name);
					} else {
						trail.push('?');
					}
				}

				trail.push(item.name);

				return trail.join(separator);
			}

			return '?';
		}
	}

	var Calculate = function() { this.initialize.apply(this, arguments) };
	Calculate.prototype = {
		initialize: function(test, data) {
			this.parameters = {
				test: 		test,
				data:		data
			};

			this.maximum = 0;
			this.score = 0;
			this.points = [];

			for (var i = 0; i < this.parameters.data.length; i++) {
				this.iterate(this.parameters.data[i].items, '');
			}

			this.points = this.points.join(',');
		},

		iterate: function(data, prefix) {
			for (var i = 0; i < data.length; i++) {
				if (data[i].key) {
					if (prefix == '') {
						var score = this.score;
						var maximum = this.maximum;
					}

					if (typeof data[i].value != 'undefined') {
						this.calculate(data[i].key, data[i]);
					}

					if (typeof data[i].items != 'undefined') {
						this.iterate(data[i].items, data[i].key);
					}

					if (prefix == '') {
						this.points.push(data[i].id + '=' + (this.score - score) + '/' + (this.maximum - maximum));
					}
				}
			}
		},

		calculate: function(prefix, data) {
			var result = true;
			var value = typeof data.value == 'object' ? data.value : { maximum: data.value };

			if (typeof data.value.conditional == 'undefined') {
				this.maximum += value.maximum;
			}

			if (typeof data.items == 'object') {
				result = 0;
				passed = true;

				for (var i = 0; i < data.items.length; i++) {
					if (data.items[i].key) {
						var r = this.getResult(data.items[i].key);
						passed &= r | YES;
						result |= r;
					}
				}

				if (!passed) {
					result = false;
				}
			}
			else {
				result = this.getResult(prefix);
			}

			if (result & YES) {
				var valid = true;

				if (typeof data.value.conditional == 'string') {
					if (data.value.conditional.substr(0, 1) == '!') {
						var conditional = this.getResult(data.value.conditional.substr(1));

						if (conditional & YES) {
							valid = false;
						}
					}
				}

				if (valid) {
					if (result & PREFIX && typeof value.award == 'object' && typeof value.award.PREFIX != 'undefined') {
						this.score += value.award.PREFIX;
					}
					else if (result & BUGGY && typeof value.award == 'object' && typeof value.award.BUGGY != 'undefined') {
						this.score += value.award.BUGGY;
					}
					else if (result & OLD && typeof value.award == 'object' && typeof value.award.OLD != 'undefined') {
						this.score += value.award.OLD;
					}
					else {
						this.score += value.maximum;
					}
				}
			}
		},

		getResult: function(key) {
			if (match = (new RegExp(key + '=(-?[0-9]+)')).exec(this.parameters.test.results)) {
				return parseInt(match[1], 10);
			}

			return null;
		}
	};



	/* Base UI functions */

	var Index = function() { this.initialize.apply(this, arguments) };
	Index.prototype = {
		initialize: function(options) {
			var that = this;
			this.options = options;

			var menu = document.createElement('div');
			menu.id = 'indexmenu';
			options.index.appendChild(menu);

			var categories = document.createElement('ul');
			menu.appendChild(categories);

			for (var i = 0; i < options.tests.length; i++) {
				var category = document.createElement('li');
				category.className = 'category ' + options.tests[i].id;
				categories.appendChild(category);

				var link = document.createElement('a');
				link.href = '#category-' + options.tests[i].id;
				link.onclick = function () { that.closeIndex(); };
				link.innerHTML = options.tests[i].name;
				category.appendChild(link);

				if (options.tests[i].items.length) {
					var items = document.createElement('ul');
					category.appendChild(items);

					for (var j = 0; j < options.tests[i].items.length; j++) {
						var item = document.createElement('li');
						items.appendChild(item);

						var link = document.createElement('a');
						link.href = '#table-' + options.tests[i].items[j].id;
						link.onclick = function () { that.closeIndex(); };
						link.innerHTML = options.tests[i].items[j].name;
						item.appendChild(link);
					}
				}
			}

			var button = document.createElement('button');
			button.innerHTML = '';
			button.id = 'indexbutton';
			button.onclick = this.toggleIndex;
			options.index.appendChild(button);

			options.wrapper.onclick = this.closeIndex;
		},

		toggleIndex: function() {
			if (document.body.className.indexOf(' indexVisible') == -1) {
				document.body.className = document.body.className.replace(' indexVisible', '') + ' indexVisible';
			} else {
				document.body.className = document.body.className.replace(' indexVisible', '');
			}
		},

		closeIndex: function() {
			document.body.className = document.body.className.replace(' indexVisible', '');
		}
	}

	var ResultsTable = function() { this.initialize.apply(this, arguments) };
	ResultsTable.prototype = {

		initialize: function(options) {
			this.parent = options.parent;
			this.tests = options.tests;
			this.options = {
				title:			options.title || '',
				// browsers:		options.browsers || [],
				columns:		options.columns || 2,
				distribute:		options.distribute || false,
				header:			options.header || false,
				links:			options.links || false,
				grading:		options.grading || false,
				features:		options.features || false,
				explainations:	options.explainations || false,

				onChange:		options.onChange || false
			}

			var that = this;

			function close(e) {
				if (that.panel) {
					var cell = that.panel.parentNode;
					var node = e.target;

					while (node.parentNode) {
						if (node == that.panel) return;
						node = node.parentNode;
					}

					that.panel.parentNode.removeChild(that.panel);
					that.panel = null;

					var node = e.target;
					while (node.parentNode) {
						if (node == cell) return e.stopPropagation();
						node = node.parentNode;
					}
				}
			}

			document.addEventListener('click', close, true)
			document.addEventListener('touchstart', close, true)

			this.data = [ null ];

			this.createCategories(this.parent, this.tests);
		},

		updateColumn: function(column, data) {
			this.data[column] = data;

			for (var c = 0; c < this.tests.length; c++)
			for (var i = 0; i < this.tests[c].items.length; i++) {
				var test = this.tests[c].items[i];

				if (typeof test != 'string') {
					if (typeof test != 'undefined') {
						var points = 0;
						var maximum = 0;

						if (match = (new RegExp(test.id + "=([0-9]+)(?:\\/([0-9]+))?(?:\\+([0-9]+))?")).exec(data.points)) {
							points = match[1];
							if (match[2]) maximum = match[2];
						}

						var row = document.getElementById('head-' + test.id);
						var cell = row.childNodes[0].firstChild.nextSibling;

						var content = "<div class='grade'>";

						if (this.options.grading) {
							var grade = '';
							var percent = parseInt(points / maximum * 100, 10);
							switch (true) {
								case percent == 0: 	grade = 'none'; break;
								case percent <= 30: grade = 'badly'; break;
								case percent <= 60: grade = 'reasonable'; break;
								case percent <= 95: grade = 'good'; break;
								default:			grade = 'great'; break;
							}

							if (points == maximum)
								content += "<span class='" + grade + "'>" + points + "</span>";
							else
								content += "<span class='" + grade + "'>" + points + "/" + maximum + "</span>";
						} else {
							content += "<span>" + points + "</span>";
						}

						content += "</div>";

						cell.innerHTML = content;
						this.updateItems(column, data, test.items);
					}
				}
			}
		},

		updateItems: function(column, data, tests) {
			var count = [ 0, 0 ];

			for (var i = 0; i < tests.length; i++) {
				if (typeof tests[i] != 'string') {
					var key = tests[i].key;

					var row = document.getElementById('row-' + key);
					var cell = row.childNodes[column + 1];

					if (typeof tests[i].items != 'undefined') {
						var results = this.updateItems(column, data, tests[i].items);

						if (results[0] == results[1])
							cell.innerHTML = '<div>Yes <span class="check">✔</span></div>';
						else if (results[1] == 0)
							cell.innerHTML = '<div>No <span class="ballot">✘</span></div>';
						else
							cell.innerHTML = '<div><span class="partially">Partial</span> <span class="partial">○</span></div>';
					}

					else {
						if (match = (new RegExp(key + '=(-?[0-9]+)')).exec(data.results)) {
							var result = parseInt(match[1], 10);

							if (result & YES) {
								switch(true) {
									case !! (result & BUGGY):		cell.innerHTML = '<div>Buggy <span class="buggy"></span></div>'; break;
									case !! (result & OLD):			cell.innerHTML = '<div>Partial <span class="partial">○</span></div>'; count[1]++; break;
									case !! (result & PREFIX):		cell.innerHTML = '<div>Prefixed <span class="check">✔</span></div>'; count[1]++; break;
									default:						cell.innerHTML = '<div>Yes <span class="check">✔</span></div>'; count[1]++; break;
								}
							}
							else {
								switch(true) {
									case !! (result & UNKNOWN):		cell.innerHTML = '<div>Unknown <span class="partial">?</span></div>'; break;
									case !! (result & BLOCKED):		cell.innerHTML = '<div>Not functional <span class="buggy">!</span></div>'; break;
									case !! (result & DISABLED):	cell.innerHTML = '<div>Disabled <span class="ballot">✘</span></div>'; break;
									default:						cell.innerHTML = '<div>No <span class="ballot">✘</span></div>'; break;
								}
							}
						} else {
							cell.innerHTML = '<div><span class="partially">Unknown</span> <span class="partial">?</span></div>';
						}
					}

					count[0]++;
				}
			}

			return count;
		},

		createCategories: function(parent, tests) {
			var left, right;

			left = document.createElement('div');
			left.className = 'left';
			left.innerHTML = '<div></div>';
			parent.appendChild(left);

			right = document.createElement('div');
			right.className = 'right';
			right.innerHTML = '<div></div>';
			parent.appendChild(right);


			for (var i = 0; i < tests.length; i++) {
				var container = parent;
				if (tests[i].column == 'left') container = left.firstChild;
				if (tests[i].column == 'right') container = right.firstChild;

				var div = document.createElement('div');
				div.className = 'category ' + tests[i].id;
				div.id = 'category-' + tests[i].id;
				container.appendChild(div);

				var h2 = document.createElement('h2');
				h2.innerHTML = tests[i].name;
				div.appendChild(h2);

				this.createSections(div, tests[i].items);
			}
		},

		createSections: function(parent, tests) {
			for (var i = 0; i < tests.length; i++) {
				var table = document.createElement('table');
				table.cellSpacing = 0;
				table.id = 'table-' + tests[i].id;
				parent.appendChild(table);

				var thead = document.createElement('thead');
				table.appendChild(thead);

				var tr = document.createElement('tr');
				tr.id = 'head-' + tests[i].id;
				thead.appendChild(tr);

				var th = document.createElement('th');
				th.innerHTML = tests[i].name + "<div></div>";
				th.colSpan = this.options.columns + 1;
				tr.appendChild(th);

				if (typeof tests[i].items != 'undefined') {
					var tbody = document.createElement('tbody');
					table.appendChild(tbody);

					var status = typeof tests[i].status != 'undefined' ? tests[i].status : '';

					this.createItems(tbody, 0, tests[i].items, {
						id:		tests[i].id,
						status:	status,
						urls:	[]
					});
				}
			}
		},

		createItems: function(parent, level, tests, data) {
			var ids = [];

			for (var i = 0; i < tests.length; i++) {
				var tr = document.createElement('tr');
				parent.appendChild(tr);

				if (typeof tests[i] == 'string') {
					if (this.options.explainations || tests[i].substr(0, 4) != '<em>') {
						var th = document.createElement('th');
						th.colSpan = this.options.columns + 1;
						th.className = 'details';
						tr.appendChild(th);

						th.innerHTML = tests[i];
					}
				} else {
					var key = tests[i].key;

					var th = document.createElement('th');
					th.innerHTML = "<div><span>" + tests[i].name + "</span></div>";
					tr.appendChild(th);

					for (var c = 0; c < this.options.columns; c++) {
						var td = document.createElement('td');
						tr.appendChild(td);
					}

					tr.id = 'row-' + key;

					if (level > 0) {
						tr.className = 'isChild';
					}

					if (typeof tests[i].items != 'undefined') {
						var urls = null;

						if (this.options.links) {
							if (typeof tests[i].urls != 'undefined') {
								urls = tests[i].urls;
							}
							else if (typeof tests[i].url != 'undefined') {
								urls = { 'w3c': tests[i].url };
							}
						}

						tr.className += 'hasChild';

						var children = this.createItems(parent, level + 1, tests[i].items, {
							id: 	key,
							status:	typeof tests[i].status != 'undefined' ? tests[i].status : data.status,
							urls:	urls
						});

						this.hideChildren(tr, children);

						(function(that, tr, th, children) {
							th.onclick = function() {
								that.toggleChildren(tr, children);
							};
						})(this, tr, th, children);
					} else {
						var urls;
						var value = 0;
						var showLinks = false;

						if (typeof tests[i].value != 'undefined') {
							value = tests[i].value;
						}

						if (typeof tests[i].urls != 'undefined') {
							urls = tests[i].urls;
							showLinks = true;
						}
						else if (typeof tests[i].url != 'undefined') {
							urls = [ [ 'w3c', tests[i].url ] ];
							showLinks = true;
						}

						th.className = 'hasLink';

						(function(that, th, data) {
							th.onclick = function() {
								new FeaturePopup(th, data);
							};
						})(this, th, {
							id:		key,
							name:	tests[i].name,
							value:	value,
							status:	typeof tests[i].status != 'undefined' ? tests[i].status : data.status,
							urls:	(urls || []).concat(data.urls || [])
						});
					}

					ids.push(tr.id);
				}
			}

			return ids;
		},

		toggleChildren: function(element, ids) {
			if (element.className.indexOf(' hidden') == -1) {
				this.hideChildren(element, ids);
			} else {
				this.showChildren(element, ids);
			}
		},

		showChildren: function(element, ids) {
			element.className = element.className.replace(' hidden', '');

			for (var i = 0; i < ids.length; i++) {
				var e = document.getElementById(ids[i]);
				e.style.display = 'table-row';
			}
		},

		hideChildren: function(element, ids) {
			element.className = element.className.replace(' hidden', '');
			element.className += ' hidden';

			for (var i = 0; i < ids.length; i++) {
				var e = document.getElementById(ids[i]);
				e.style.display = 'none';
			}
		}
	}
