(function() {
	"use strict";

	function $(query, context) {
		return "string" == typeof query ? (context || document).querySelector(query) : null;
	}

	function $$(query, context) {
		return [].slice.call((context || document).querySelectorAll(query));
	}

	function parseOptions(options, defaults) {
		(("object" == typeof options && options) || (options = {}));

		for(var d in defaults) {
			(options.hasOwnProperty(d) || (options[d] = defaults[d]));
		}

		return options;
	}

	// DOM Element helper class for easy DOM manipulation
	function Element(selector, options) {
		// Determine if an element should be wrapped or created
		if(selector instanceof Element) {
			return selector;
		} else if(selector instanceof HTMLElement && !(this instanceof Element)) {
			return new Element(selector, options);
		} else if(!(this instanceof Element)) {
			return (selector = $(selector, (options instanceof Element ? options.dom : options))) ? new Element(selector) : null;
		}

		// Parse options and inject defaults
		options = parseOptions(options, {
			appendTo:       null,
			context:        document,
			html:           "",
			insertAfter:    null,
			insertBefore:   null,
			replace:        null
		});

		var a, parsed, elem = (selector instanceof HTMLElement ? selector : null);

		// Create a new element based on the selector string
		if("string" == typeof selector) {
			parsed = (function(selector, parsed) {
				selector.match(/(\[[^\]]+\]|#[^#.\[]+|\.[^#.\[]+|\w+)/g)
				.forEach(function(m) {
					// Attribute
					(m[0] == "[" ? ((m = m.match(/^\[([^=\]]+)=?([^\]]+)?\]$/)) && (parsed.attribs[m[1]] = m[2] || "")) :

					// Class
					(m[0] == "." ? parsed.classes.push(m.substr(1)) :

					// ID
					(m[0] == "#" ? (parsed.attribs.id = m.substr(1)) :

					// Tag
					(parsed.tag = m))));
				});

				return parsed;
			})(selector, { attribs: {}, classes: [] });

			// Create element from parsed string
			elem = options.context.createElement(parsed.tag);

			// Add classes
			parsed.classes.forEach(function(className) {
				elem.classList.add(className);
			});

			// Add attributes
			for(a in parsed.attribs) {
				(parsed.attribs.hasOwnProperty(a) && elem.setAttribute(a, parsed.attribs[a]));
			}
		}

		// Add public properties
		this.events = {};
		this.dom    = (selector instanceof HTMLElement ? selector : elem);
		this.parent = (selector instanceof HTMLElement ? Element(selector.parentElement) : null);

		// Add inner HTML if a new element was created
		(options.html && elem && (elem.innerHTML = options.html));

		// Add element to DOM
		if((a = Element(options.replace))) {
			a.parent.replace(this, a);
		} else if((a = Element(options.appendTo))) {
			a.append(this);
		} else if((a = Element(options.insertAfter))) {
			a.parent.append(this, a);
		} else if((a = Element(options.insertBefore))) {
			a.parent.insert(this, a);
		}
	}

	Element.prototype = {
		add: function(elements) {
			(elements instanceof Array ? elements : [ elements ])
			.forEach(function(element) {
				if((element = Element(element))) {
					this.dom.appendChild(element.dom);
					element.parent = this;
				}
			}, this);

			return this;
		},
		append: function(element, after) {
			if((after = this.child(after))) {
				this.dom.insertBefore(
					Element(element).dom,
					after.dom.nextElementSibling
				);
			} else {
				this.dom.appendChild(Element(element).dom);
			}

			(element instanceof Element && (element.parent = this));
			return this;
		},
		attrib: function(key, value) {
			if("string" == typeof key) {
				if(undefined !== value) {
					this.dom.setAttribute(key, value);
				} else {
					return this.dom.getAttribute(key);
				}
			}

			return value;
		},
		child: function(selector) {
			if("string" == typeof selector) {
				var context = this.dom, c, children, d, derivatives;

				selector.split(" ").forEach(function(segment, index, array) {
					if(context && index < array.length - 1) {
						context = $(segment, context);
					}
				});

				if(context) {
					children = [].slice.call(context.children);
					derivatives = $$(selector, context);

					for(d in derivatives) {
						for(c in children) {
							if(derivatives[d] === children[c]) {
								return Element(children[c]);
							}
						}
					}
				}
			} else if(selector instanceof Element) {
				return (selector.dom.parentElement === this.dom ? selector : null);
			} else if(selector instanceof HTMLElement) {
				return (selector.parentElement === this.dom ? Element(selector) : null);
			}

			return null;
		},
		get classes() {
			return this.dom.classList;
		},
		clear: function() {
			var elem = this.dom, child;

			while((child = elem.firstChild)) {
				elem.removeChild(child);
			}

			return this;
		},
		get enabled() {
			return !this.dom.hasAttribute("disabled");
		},
		set enabled(enable) {
			if(!!enable) {
				this.dom.removeAttribute("disabled");
			} else {
				this.dom.setAttribute("disabled", "");
			}

			return this.enabled;
		},
		focus: function() {
			this.dom.focus();
			this.dom.selectionStart = this.value.length;
		},
		get html() {
			return this.dom.innerHTML;
		},
		set html(value) {
			return (this.dom.innerHTML = value);
		},
		insert: function(element, before) {
			this.dom.insertBefore(
				Element(element).dom,
				((before = this.child(before)) ? before.dom : this.dom.firstElementChild)
			);

			(element instanceof Element && (element.parent = this));
			return this;
		},
		on: function(events, callback, context) {
			(events instanceof Array ? events : [ events ])
			.forEach(function(event) {
				if("string" == typeof event) {
					var self = this, fn = ("function" == typeof callback ? function(e) { return callback.call((context || self), e); } : null);
					(self.events[event] instanceof Array || (self.events[event] = []));

					if(fn) {
						self.events[event].push(fn);
						self.dom.addEventListener(event, fn);
					} else {
						self.events[event].forEach(function(callback, index, array) {
							self.dom.removeEventListener(event, callback);
							array.splice(index, 1);
						});
					}
				}
			}, this);

			return this;
		},
		remove: function(element) {
			if((element = Element(element))) {
				this.dom.removeChild(element.dom);
			}
		},
		replace: function(newElement, oldElement) {
			if((newElement = new Element(newElement)) && (oldElement = Element(oldElement, this))) {
				this.dom.replaceChild(newElement.dom, oldElement.dom);
				newElement.parent = this;
				oldElement.parent = null;
			}

			return this;
		},
		get value() {
			return undefined !== this.dom.value ? this.dom.value : this.html;
		},
		set value(value) {
			if(undefined !== this.dom.value) {
				return (this.dom.value = value);
			}

			return (this.html = value);
		}
	};

	function FileFunnel(selector, options) {
		this._files   = [];
		this._i18n    = FileFunnel.i18n.en_GB;

		// Parse and merge options with defaults
		this._options = parseOptions(options, {
			accept:     "*/*",          // Semicolon-separated MIME types
			chunked:    false,
			chunkSize:  0x100000,       // Chunk byte size (1 MiB by default)
			className:  "filefunnel",   // Dot-separated CSS class names
			multiple:   false
		});

		// Use locale specified in constructor options if specified, otherwise browser locale. Default locale as fallback
		this.locale = (options.locale || (navigator ? (navigator.userLanguage || navigator.language).replace("-", "_") : null));

		var i18n = this._i18n, options = this._options, files = this._files;
		var acceptTypes = ("string" == typeof options.accept ? options.accept : "*/*");
		var multiAttrib = (true === options.multiple ? "[multiple]" : "");

		// Create DOM form and child elements
		var elems = this.elements = {
			form:           new Element("form[enctype=multipart/form-data]." + options.className, { appendTo: Element(selector) }),
			browseButton:   new Element("input[type=button][value=" + (options.multiple ? i18n.browseMultiple : i18n.browse) + "].browse"),
			fileInput:      new Element("input[type=file][accept=" + acceptTypes + "][hidden]" + multiAttrib),
			fileList:       new Element("div.filelist"),
			submitButton:   new Element("input[type=submit][value=" + i18n.upload + "][disabled].submit"),
			resetButton:    new Element("input[type=reset][value=" + i18n.reset + "].reset")
		};

		// Add child elements to form
		elems.form.add([ elems.browseButton, elems.fileInput, elems.fileList, elems.submitButton, elems.resetButton ]);

		// Enable file browsing using the browseButton proxy
		elems.browseButton.on("click", function() {
			elems.fileInput.dom.click();
		});

		// Handle chosen files
		elems.fileInput.on("change", function(event) {
			files.length = 0;
			elems.fileList.clear();
			elems.fileListItems = [];

			[].slice.call(event.target.files).forEach(function(file) {
				var fileSize = file.size, fileModified = file.lastModifiedDate, fileItemElems = {};

				// Round filesize and add correct suffix for gibis, mibis and kibis
				fileSize = (fileSize >= 0x40000000 ? ((fileSize / 0x40000000).toFixed(2) + i18n.gibiBytes) :
					(fileSize >= 0x100000 ? ((fileSize / 0x100000).toFixed(2) + i18n.mebiBytes) :
						(fileSize >= 0x400 ? ((fileSize / 0x400).toFixed(2) + i18n.kibiBytes) :
							(fileSize += i18n.bytes))));

				// Populate filelist DOM with new fileinfo item
				elems.fileList.add(new Element("fieldset.fileinfo")
					.append(new Element("legend", { html: file.name }))
					.append((fileItemElems.name = new Element("input[type=text][placeholder=" + i18n.fileName + "][value=" + file.name + "].name")))
					.append((fileItemElems.size = new Element("input[type=text][placeholder=" + i18n.fileSize + "][value=" + fileSize + "][disabled].size")))
					.append((fileItemElems.type = new Element("input[type=text][placeholder=" + i18n.fileType + "][value=" + file.type + "][disabled].type")))
					.append((fileItemElems.prog = new Element("progress[value=0].progress")))
					.append((fileItemElems.info = new Element("span.info")))
				);

				files.push({ elements: fileItemElems, finished: false, reference: file });
			});

			// Enable/Disable the upload button
			elems.submitButton.enabled = event.target.files.length;
		});

		// Handle form submit
		elems.form.on("submit", function(event) {
			event.preventDefault();

			elems.fileInput.enabled = elems.submitButton.enabled = false;
			elems.resetButton.value = i18n.cancel;

			function finalizeUpload(file) {
				file.finished = true;

				for(var f in files) {
					if(!files[f].finished) {
						return;
					}
				}

				elems.fileInput.enabled = true;
				elems.resetButton.value = i18n.reset;
			}

			if(options.chunked) {
				var chunkSize = ("number" == typeof options.chunkSize ? options.chunkSize: 0x100000);

				files.forEach(function(file) {
					var bytesSent = 0, bytesTotal = file.reference.size;
					var fileName = file.elements.name.value;

					var sendNextChunk = function() {
						var chunk = file.reference.slice(bytesSent, Math.min(bytesTotal, bytesSent + chunkSize) + 1, file.reference.type);
						var xhr = new XMLHttpRequest();

						xhr.upload.onloadstart = function(e) {
							file.elements.prog.attrib("max", bytesTotal + (e.lengthComputable ? e.total : 0));
							file.elements.prog.value = bytesSent;
						};

						xhr.upload.onloadend = function() {
							file.elements.prog.attrib("max", bytesTotal);
							file.elements.prog.value = (bytesSent += chunk.size);

							if(bytesSent < bytesTotal) {
								if("function" == typeof sendNextChunk) {
									sendNextChunk();
								} else {
									finalizeUpload(file);
								}
							} else {
								file.elements.info.classes.add("success");
								file.elements.info.value = i18n.success;
								finalizeUpload(file);
							}
						};

						xhr.upload.onprogress = function(e) {
							(e.lengthComputable && (file.elements.prog.value = bytesSent + e.loaded));
						};

						xhr.onreadystatechange = function(e) {
							if(e.target.status >= 400) {
								file.elements.prog.attrib("max", (file.elements.prog.value = 0));
								file.elements.info.classes.add("error");
								sendNextChunk = null;
								finalizeUpload(file);

								// Decide error message from status code (fallback to status text)
								switch(e.target.status) {
									case 401: case 403:
										file.elements.info.value = i18n.forbidden;
										break;

									case 413:
										file.elements.info.value = i18n.oversized;
										break;

									default:
										file.elements.info.value = e.target.statusText;
								}
							}
						};

						xhr.onerror = function() {
							file.elements.prog.attrib("max", (file.elements.prog.value = 0));
							file.elements.info.classes.add("error");
							file.elements.info.value = i18n.refused;
							sendNextChunk = null;
							finalizeUpload(file);
						};

						xhr.open("POST", options.server, true);

						xhr.setRequestHeader("Content-Type", chunk.type);
						xhr.setRequestHeader("X-File-Name", fileName);
						xhr.setRequestHeader("X-File-Size", bytesTotal);

						xhr.send(chunk);
					};

					file.elements.prog.attrib("max", bytesTotal);
					sendNextChunk();
				});
			} else {
				var xhr = new XMLHttpRequest(), formData = new FormData();

				xhr.onreadystatechange = function(e) {
					if(e.target.status >= 200 && e.target.status < 300) {
						files.forEach(function(file) {
							file.elements.prog.attrib("max", e.total || 1);
							file.elements.prog.attrib("value", e.loaded || 1);
							file.elements.info.classes.add("success");
							file.elements.info.value = i18n.success;
							finalizeUpload(file);
						});
					}
				};

				xhr.onerror = function(e) {
					files.forEach(function(file) {
						file.elements.prog.attrib("max", (file.elements.prog.value = 0));
						file.elements.info.classes.add("error");
						file.elements.info.value = i18n.refused;
						finalizeUpload(file);
					});
				};

				files.forEach(function(file) {
					formData.append(file.reference.name, file.reference, file.elements.name.value);
					file.elements.prog.dom.removeAttribute("value");
				});

				xhr.open("POST", options.server, true);
				xhr.send(formData);
			}
		});

		// Handle form reset
		elems.form.on("reset", function() {
			elems.fileList.clear();
			elems.fileListItems = [];
			elems.fileInput.enabled = true;
			elems.submitButton.enabled = false;
			elems.resetButton.value = i18n.reset;
		});
	}

	FileFunnel.VERSION = 0.14;

	// Prototype methods
	FileFunnel.prototype = {
		get locale() {
			return this._i18n;
		},
		set locale(value) {
			if(FileFunnel.i18n[value] && (FileFunnel.i18n[value] !== this._i18n)) {
				this._i18n = FileFunnel.i18n[value];
				// TODO: Locale hotswap
			}
		}
	};

	// Default locale settings
	FileFunnel.i18n = {
		en_GB: {
			// Button labels
			browse:         "Choose file",
			browseMultiple: "Choose files",
			cancel:         "Cancel",
			reset:          "Reset",
			upload:         "Upload",

			// Size indicators
			bytes:          " bytes",
			gibiBytes:      " GiB",
			kibiBytes:      " KiB",
			mebiBytes:      " MiB",

			// Placeholder texts
			fileName:       "Filename",
			fileSize:       "Filesize",
			fileType:       "Filetype",

			// Status indicators
			forbidden:      "Unauthorised for upload",
			oversized:      "File too big for upload",
			refused:        "Connection refused",
			success:        "Upload successful"
		}
	};

	if("undefined" != typeof window) {
		window.FileFunnel = FileFunnel;
	}

	if("object" == typeof module && module.exports) {
		module.exports = FileFunnel;
	}

	return FileFunnel;
}());
