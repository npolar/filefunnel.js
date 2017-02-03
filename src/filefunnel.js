(function() {
	"use strict";

	function $(query, context) {
		return "string" == typeof query ? (context || document).querySelector(query) : null;
	}

	function $$(query, context) {
		return [].slice.call((context || document).querySelectorAll(query));
	}

	// Object.assign polyfill
	("function" != typeof Object.assign && (Object.assign = function(target) {
		if(undefined === target || null === target) {
			throw new TypeError("Cannot convert undefined or null to object");
		}

		var output = Object(target), index, source, key;

		for(index = 1; index < arguments.length; ++index) {
			if(undefined !== (source = arguments[index]) && null !== source) {
				for(key in source) {
					(source.hasOwnProperty(key) && (output[key] = source[key]));
				}
			}
		}

		return output;
	}));

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
		options = Object.assign({
			appendTo:       null,
			context:        document,
			html:           "",
			insertAfter:    null,
			insertBefore:   null,
			replace:        null
		}, options);

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
			a.parent.replace(a, this);
		} else if((a = Element(options.appendTo))) {
			a.append(this);
		} else if((a = Element(options.insertAfter))) {
			a.parent.append(this, a);
		} else if((a = Element(options.insertBefore))) {
			a.parent.insert(this, a);
		}

		// Add proxy functions to attribute map
		var dom = this.dom, attribProxies = {
			add: function() {
				[].slice.call(arguments).forEach(function(arg) {
					dom.setAttribute(arg, "");
				});
				return dom.attributes;
			},
			get: function(key) {
				return dom.getAttribute(arg);
			},
			remove: function() {
				[].slice.call(arguments).forEach(function(arg) {
					dom.removeAttribute(arg);
				});
				return dom.attributes;
			},
			set: function(key, value) {
				dom.setAttribute(key, value);
				return dom.attributes;
			}
		};

		for(var p in attribProxies) {
			dom.attributes[p] = attribProxies[p];
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
		get attribs() {
			return this.dom.attributes;
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
		replace: function(oldElement, newElement) {
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
		},
		get visible() {
			return !this.dom.hasAttribute("hidden");
		},
		set visible(visible) {
			if(!!visible) {
				this.dom.removeAttribute("hidden");
			} else {
				this.dom.setAttribute("hidden", "");
			}

			return this.visible;
		}
	};

	function FileFunnel(selector, options) {
		this._callbacks = {};
		this._elements  = {};
		this._i18n      = {};
		this._parent    = Element(selector);

		// Parse and merge options with defaults
		this._options = Object.assign({
			accept:         "*/*",          // Comma-separated MIME types
			autoResize:     true,           // Enable automatic widget resizing
			auth:           null,           // String with Authorization header contents
			chunked:        false,          // Enable chunked uploading
			chunkSize:      0x100000,       // Chunk byte size (1 MiB by default)
			className:      "filefunnel",   // Dot-separated CSS class names
			credentials:    false,          // Allow requests with credentials/cookies information
			emptyNames:     false,          // Allow empty file names
			headers:        {},             // Additional request headers to be sent
			maxSize:        Infinity,       // Maximum file size accepted by the client
			multiple:       false,          // Enable upload of multiple files
			preview:        false,          // Enable preview of supported files
			progress:       false           // Enable progress tracking (for non-chunked upload)
		}, options);

		// Array of files for upload
		this.files  = [];

		// Use locale specified in constructor options if specified, otherwise browser locale. Default locale as fallback
		this.locale = (this._options.locale || (navigator ? (navigator.userLanguage || navigator.language).replace("-", "_") : null));

		// Initially use NONE as status
		this.status = FileFunnel.status.NONE;

		// Build DOM elements
		return this.build();
	}

	FileFunnel.VERSION = "0.12.3";

	FileFunnel.status = { NONE: 0, READY: 1, UPLOADING: 2, COMPLETED: 3, ABORTED: 4, FAILED: 5 };

	// Prototype methods
	FileFunnel.prototype = {
		abort: function() {
			(this._elements.resetButton && this._elements.resetButton.dom.click());
		},
		get auth() {
			return ("string" == typeof this._options.auth ? this._options.auth : null);
		},
		set auth(contents) {
			return (this._options.auth = ("string" == typeof contents ? contents : null));
		},
		browse: function() {
			(this._elements.fileInput && this._elements.fileInput.dom.click());
		},
		build: function() {
			var self = this, files = self.files, i18n = self._i18n, options = self._options, parent = self._parent;

			// Remove characters that could possibly corrupt the dom from acceptable file types, and split to array
			var acceptTypes = ("string" == typeof options.accept ? options.accept : "*/*").replace(/[\[\]#\s]/g, "").split(",");

			// Create DOM form and child elements
			var elems = {
				form:           new Element("form[enctype=multipart/form-data][method=POST]." + options.className),
				browseButton:   new Element("input[type=button][value=" + (options.multiple ? i18n.add : i18n.browse) + "].browse"),
				fileInput:      new Element("input[type=file][accept=" + acceptTypes.join(",") + "][hidden][multiple]"),
				fileList:       new Element("div.filelist"),
				submitButton:   new Element("input[type=submit][value=" + i18n.upload + "][disabled].submit"),
				resetButton:    new Element("input[type=reset][value=" + i18n.reset + "].reset")
			};

			// Create localized map of predefined status codes
			var statusTexts = {
				401: i18n.forbidden,
				403: i18n.forbidden,
				409: i18n.exists,
				412: i18n.invalidName,
				413: i18n.oversized,
				415: i18n.unsupported,
				422: i18n.unprocessable
			};

			// Disable multi file upload if not explicitly defined in options
			(true !== options.multiple && elems.fileInput.dom.removeAttribute("multiple"));

			// Add child elements to form
			elems.form.add([ elems.browseButton, elems.fileInput, elems.fileList, elems.submitButton, elems.resetButton ]);

			// Add form element to DOM if parent exists
			if(parent) {
				if(self._elements.form && self._elements.form.parent) {
					// Replace existing form if available
					self._elements.form.parent.replace(self._elements.form, elems.form);
				} else if(parent.dom instanceof HTMLInputElement) {
					// Create a hidden-by-default widget for HTMLInputElement parents
					parent.parent.append(elems.form, parent);
					elems.form.classes.add("widget");

					// Hide and resize widget
					self._elements = elems;
					self.hide().resize();

					// Open widget when parent input element is clicked
					parent.on("click", function() {
						self.toggle();
					});

					// Close when clicking outside of widget
					document.addEventListener("click", function(e, node) {
						if(elems.form.visible) {
							while((node = (node ? node.parentNode : e.target))) {
								if(node == elems.form.dom || node == parent.dom) {
									return;
								}
							}

							self.hide();
						}
					});

					// Enable auto-resizing if applicable
					window.addEventListener("resize", function() {
						(true === options.autoResize && self.resize());
					});
				} else {
					// Append to (container) element for other parent types
					parent.append(elems.form);
				}
			}

			// Update internal _elements property with new elements
			self._elements = elems;

			// Enable file browsing using the browseButton proxy
			elems.browseButton.on("click", function() {
				elems.fileInput.dom.click();
			});

			// Handle chosen files
			elems.fileInput.on("change", function(event) {
				// Clear file list if multiple files is not allowed
				if(!options.multiple) {
					files.length = 0;
					elems.fileList.clear();
				}

				[].slice.call(event.target.files).forEach(function(file) {
					var file, fileSize = file.size, fileModified = file.lastModifiedDate, fileItemElems = {};

					// Ignore files that has already been added
					for(var f, i = 0; i < files.length; ++i) {
						if((f = files[i].reference).name == file.name && f.lastModifiedDate.valueOf() == fileModified.valueOf()) {
							return;
						}
					}

					// Round filesize and add correct suffix for gibis, mibis and kibis
					fileSize = (fileSize >= 0x40000000 ? ((fileSize / 0x40000000).toFixed(2) + i18n.gibiBytes) :
						(fileSize >= 0x100000 ? ((fileSize / 0x100000).toFixed(2) + i18n.mebiBytes) :
							(fileSize >= 0x400 ? ((fileSize / 0x400).toFixed(2) + i18n.kibiBytes) :
								(fileSize += i18n.bytes))));

					// Populate filelist DOM with new fileinfo item
					elems.fileList.add(new Element("fieldset.fileinfo")
						.append(new Element("legend", { html: file.name }))
						.append((fileItemElems.name = new Element("input[type=text].name")))
						.append((fileItemElems.size = new Element("input[type=text][disabled].size")))
						.append((fileItemElems.type = new Element("input[type=text][disabled].type")))
						.append((fileItemElems.prog = new Element("progress[value=0].progress")))
						.append((fileItemElems.view = new Element("div[hidden].view")))
						.append((fileItemElems.info = new Element("span.info")))
					);

					// Set placeholder and value attributes of filename, filesize and filetype input elements
					fileItemElems.name.attribs.set("placeholder", i18n.fileName).set("value", file.name);
					fileItemElems.size.attribs.set("placeholder", i18n.fileSize).set("value", fileSize);
					fileItemElems.type.attribs.set("placeholder", i18n.fileType).set("value", file.type);

					if(options.preview)
					{
						// Image files
						if(file.type.match(/^image\//)) {
							var reader = new FileReader();

							reader.onload = function() {
								var imageElem, closeElem, url = reader.result;

								fileItemElems.view
								.add((imageElem = new Element("img")))
								.add((closeElem = new Element("a.close", { html: "&times;" })))
								.attribs.remove("hidden");

								imageElem
								.on("click", function() { window.open(url, "_blank"); })
								.attribs.set("title", i18n.previewOpen).set("src", url);

								closeElem
								.on("click", function() { fileItemElems.view.visible = false; })
								.attribs.set("title", i18n.previewClose);
							};

							reader.readAsDataURL(file);
						}
					}

					// Prevent empty names if not allowed
					if(!options.emptyNames) {
						fileItemElems.name.on([ "input", "change" ] , function(e) {
							if(!e.target.value && FileFunnel.status.READY == file.status) {
								file.status = FileFunnel.status.ABORTED;
								file.elements.info.classes.add("error");
								file.elements.info.value = i18n.invalidName;
							} else if(i18n.invalidName == file.elements.info.value) {
								file.status = FileFunnel.status.READY;
								file.elements.info.classes.remove("error");
								file.elements.info.value = "";
							}

							// Disable upload if no files are ready for upload
							elems.submitButton.enabled = files.some(function(file) { return FileFunnel.status.READY == file.status; });
						});
					}

					// Push added file to files array for future reference
					files.push((file = {
						bytesSent:  0,
						bytesTotal: file.size,
						elements:   fileItemElems,
						location:   null,
						parent:     self,
						reference:  file,
						response:   null,
						status:     FileFunnel.status.READY,
						xhr:        null,

						get progress() {
							return (FileFunnel.status.UPLOADING == this.status ? Math.round((this.bytesSent / this.bytesTotal) * 100) : NaN);
						}
					}));

					// Function used to check if filetype is supported
					function mimeMatchFunc(inputType) {
						var mimeMatch = inputType.match(/^([^/]+)\/(.*)$/);
						return function(acceptType) {
							return ((acceptType == inputType) || (mimeMatch && acceptType == mimeMatch[1] + "/*") || (acceptType == "*/*"));
						};
					}

					// Verify that the file is acceptable (client side)
					if(file.reference.size > options.maxSize) {
						file.status = FileFunnel.status.ABORTED;
						file.elements.info.classes.add("error");
						file.elements.info.value = i18n.oversized;
					} else if(!acceptTypes.some(mimeMatchFunc(file.reference.type))) {
						file.status = FileFunnel.status.ABORTED;
						file.elements.info.classes.add("error");
						file.elements.info.value = i18n.unsupported;
					}
				});

				// Set status, and enable/disable the upload button
				self.status = (files.length ? FileFunnel.status.READY : FileFunnel.status.NONE);
				elems.submitButton.enabled = files.some(function(file) { return FileFunnel.status.READY == file.status; });
			});

			// Handle form submit
			elems.form.on("submit", function(e) {
				e.preventDefault();
				self.upload();
			});

			// Redefine upload function
			self.upload = function() {
				elems.browseButton.enabled = elems.submitButton.enabled = false;
				elems.resetButton.value = i18n.cancel;
				self.status = FileFunnel.status.UPLOADING;

				// Set Authentication if specified
				if("string" == typeof options.auth) {
					options.credentials = true;

					options.headers = Object.assign({
						Authorization: options.auth
					}, options.headers);
				}

				// Enable aborting ongoing uploads
				elems.resetButton.on("click", function(e) {
					e.preventDefault();

					if(options.chunked) {
						for(var f in files) {
							(files[f].xhr instanceof XMLHttpRequest && files[f].xhr.abort());
						}
					} else {
						(files.xhr instanceof XMLHttpRequest && files.xhr.abort());
					}
				});

				function finalizeUpload(file) {
					for(var f in files) {
						if(FileFunnel.status.UPLOADING == files[f].status) {
							return;
						}
					}

					elems.resetButton.on("click", null);
					elems.resetButton.value = i18n.reset;
					self.status = FileFunnel.status.COMPLETED;
				}

				if(options.chunked) {
					var chunkSize = ("number" == typeof options.chunkSize ? options.chunkSize: 0x100000);

					files.forEach(function(file) {
						// Ignore files not ready for upload (i.e. invalid files)
						if(file.status != FileFunnel.status.READY) {
							return;
						}

						var fileName = file.elements.name.value;

						var sendNextChunk = function() {
							var chunk = file.reference.slice(file.bytesSent, Math.min(file.bytesTotal, file.bytesSent + chunkSize) + 1, file.reference.type);
							var xhr = file.xhr = new XMLHttpRequest(), headers;

							// Chunked upload start callback
							xhr.onloadstart = function(e) {
								file.status = FileFunnel.status.UPLOADING;

								// Run start callback if defined
								("function" == typeof self._callbacks.start && self._callbacks.start(file));
							};

							xhr.onreadystatechange = function(e, str) {
								if(xhr.HEADERS_RECEIVED == xhr.readyState) {
									if((str = xhr.getAllResponseHeaders())) {
										str.split("\r\n").forEach(function(line) {
											if((line = line.match(/\s*([^:]*)\s*:\s*(.*)\s*/))) {
												headers[line[1]] = line[2];
											}
										});
									}
								}
							};

							// Chunked upload progress callback
							xhr.upload.onprogress = function(e) {
								(e.lengthComputable && (file.elements.prog.value = (file.bytesSent + e.loaded)));
								(file.bytesSent + e.loaded >= file.bytesTotal && (file.elements.info.value = i18n.processing));

								// Run progress callback if defined
								("function" == typeof self._callbacks.progress && self._callbacks.progress(file));
							};

							// Chunked upload success callback
							xhr.onload = function(e) {
								var status = e.target.status;

								file.response = {
									headers:	headers || {},
									code:		status,
									text:		xhr.responseText,
									json:		(headers["Content-Type"] || "").match(/\/(?:json|.+\+json)(?:$|;)/) ? JSON.parse(xhr.responseText) : null
								};

								// Success handling
								if(200 <= status && 300 > status) {
									file.elements.prog.attribs.set("max", file.bytesTotal).set("value", (file.bytesSent += chunk.size));

									// Send next chunk if available
									if(file.bytesSent < file.bytesTotal) {
										return ("function" == typeof sendNextChunk && sendNextChunk());
									}

									file.status = FileFunnel.status.COMPLETED;
									file.elements.info.classes.add("success");
									file.elements.info.value = i18n.success;
									finalizeUpload(file);

									if(201 == status) {
										file.location = xhr.getResponseHeader("Content-Location") || null;
									}

									// Run success callback if defined
									("function" == typeof self._callbacks.success && self._callbacks.success(file));
								}

								// Error handling
								else if(400 <= status) {
									file.status = FileFunnel.status.FAILED;
									file.elements.info.classes.add("error");
									file.elements.info.value = statusTexts[status] || i18n.failed;
									finalizeUpload(file);

									// Run error callback if defined
									("function" == typeof self._callbacks.error && self._callbacks.error(file));
								}
							};

							// Chunked upload abort callback
							xhr.onabort = function() {
								file.status = FileFunnel.status.ABORTED;
								file.elements.info.value = i18n.aborted;
								finalizeUpload(file);

								// Run abort callback if defined
								("function" == typeof self._callbacks.abort && self._callbacks.abort(file));
							};

							// Chunked upload timeout callback
							xhr.ontimeout = function() {
								file.status = FileFunnel.status.FAILED;
								file.elements.info.classes.add("error");
								file.elements.info.value = i18n.timeout;
								finalizeUpload(file);

								// Run error callback if defined
								("function" == typeof self._callbacks.error && self._callbacks.error(file));
							};

							// Chunked upload error callback
							xhr.onerror = function() {
								file.status = FileFunnel.status.FAILED;
								file.elements.info.classes.add("error");
								file.elements.info.value = i18n.refused;
								finalizeUpload(file);

								// Run error callback if defined
								("function" == typeof self._callbacks.error && self._callbacks.error(file));
							};

							var h, headers = Object.assign({
								"Content-Type": chunk.type,
								"X-File-Name": fileName,
								"X-File-Size": file.bytesTotal
							}, options.headers);

							xhr.open("POST", options.server, true);
							xhr.withCredentials = (options.credentials === true);

							for(h in headers) {
								xhr.setRequestHeader(h, headers[h]);
							}

							xhr.send(chunk);
						};

						file.elements.prog.attribs.set("max", file.bytesTotal);
						sendNextChunk();
					});
				} else {
					var xhr = files.xhr = new XMLHttpRequest(), formData = new FormData(), file, fileInProgress = 0, byteOffset = 0, headers = {};

					// Form upload start callback
					xhr.onloadstart = function(e) {
						files.forEach(function(file) {
							if(FileFunnel.status.READY == file.status) {
								file.status = FileFunnel.status.UPLOADING;
								file.elements.prog.attribs.remove("max", "value");

								// Run start callback if defined
								("function" == typeof self._callbacks.start && self._callbacks.start(file));
							}
						});
					};

					xhr.onreadystatechange = function(e, str) {
						if(xhr.HEADERS_RECEIVED == xhr.readyState) {
							if((str = xhr.getAllResponseHeaders())) {
								str.split("\r\n").forEach(function(line) {
									if((line = line.match(/\s*([^:]*)\s*:\s*(.*)\s*/))) {
										headers[line[1]] = line[2];
									}
								});
							}
						}
					};

					// Form upload progress callback
					if(options.progress) {
						xhr.upload.onprogress = function(e) {
							if(e.lengthComputable) {
								if((file = files[fileInProgress]) && FileFunnel.status.UPLOADING == file.status) {
									// Update progressbar for current file
									file.elements.prog.attribs
									.set("max", file.bytesTotal)
									.set("value", (file.bytesSent = Math.min(file.bytesTotal, e.loaded - byteOffset)));

									// Proceed with next file when fully uploaded
									if(file.bytesSent >= file.bytesTotal) {
										++fileInProgress;
										byteOffset += file.bytesTotal;
										file.elements.info.value = i18n.processing;
									}

									// Run progress callback if defined
									("function" == typeof self._callbacks.progress && self._callbacks.progress(file));
								}
							}
						};
					}

					// Form upload success callback
					xhr.onload = function(e) {
						var status = e.target.status;

						files.forEach(function(file) {
							if(FileFunnel.status.UPLOADING == file.status) {
								file.response = {
									headers:	headers || {},
									code:		xhr.status,
									text:		xhr.responseText,
									json:		(headers["Content-Type"] || "").match(/\/(?:json|.+\+json)(?:$|;)/) ? JSON.parse(xhr.responseText) : null
								};

								// Success handling
								if(200 <= status && 300 > status) {
									file.status = FileFunnel.status.COMPLETED;
									file.bytesSent = file.bytesTotal;
									file.elements.prog.attribs.set("max", 1).set("value", 1);
									file.elements.info.classes.add("success");
									file.elements.info.value = statusTexts[status] || i18n.success;
									finalizeUpload(file);

									// Run success callback if defined
									("function" == typeof self._callbacks.success && self._callbacks.success(file));
								}

								// Error handling
								else if(400 <= status) {
									file.status = FileFunnel.status.FAILED;
									file.elements.prog.attribs.set("max", 1).set("value", 0);
									file.elements.info.classes.add("error");
									file.elements.info.value = statusTexts[status] || i18n.failed;
									finalizeUpload(file);

									// Run error callback if defined
									("function" == typeof self._callbacks.error && self._callbacks.error(file));
								}
							}
						});
					};

					// Form upload abort callback
					xhr.onabort = function() {
						files.forEach(function(file) {
							file.status = FileFunnel.status.ABORTED;
							file.elements.prog.attribs.set("max", 1).set("value", 0);
							file.elements.info.value = i18n.aborted;
							finalizeUpload(file);

							// Run abort callback if defined
							("function" == typeof self._callbacks.abort && self._callbacks.abort(file));
						})
					};

					// Form upload timeout callback
					xhr.ontimeout = function() {
						files.forEach(function(file) {
							file.status = FileFunnel.status.FAILED;
							file.elements.prog.attribs.set("max", 1).set("value", 0);
							file.elements.info.classes.add("error");
							file.elements.info.value = i18n.timeout;
							finalizeUpload(file);

							// Run error callback if defined
							("function" == typeof self._callbacks.error && self._callbacks.error(file));
						});
					};

					// Form upload error callback
					xhr.onerror = function(e) {
						files.forEach(function(file) {
							file.status = FileFunnel.status.FAILED;
							file.elements.prog.attribs.set("max", 1).set("value", 0);
							file.elements.info.classes.add("error");
							file.elements.info.value = i18n.refused;
							finalizeUpload(file);

							// Run error callback if defined
							("function" == typeof self._callbacks.error && self._callbacks.error(file));
						});
					};

					// Add files ready for upload (i.e. valid files)
					files.forEach(function(file) {
						if(file.status == FileFunnel.status.READY) {
							formData.append(file.reference.name, file.reference, file.elements.name.value);
							file.elements.prog.dom.removeAttribute("value");
						}
					});

					var h, headers = options.headers;

					xhr.open("POST", options.server, true);
					xhr.withCredentials = (options.credentials === true);

					for(var h in headers) {
						xhr.setRequestHeader(h, headers[h]);
					}

					xhr.send(formData);
				}
			};

			// Handle form reset
			elems.form.on("reset", function() {
				files.length = 0;
				elems.fileList.clear();
				elems.browseButton.enabled = true;
				elems.submitButton.enabled = false;
				elems.resetButton.value = i18n.reset;
				self.status = FileFunnel.status.NONE;

				// Run reset callback if defined
				("function" == typeof self._callbacks.reset && self._callbacks.reset());
			});

			return this;
		},
		get element() {
			return (this._parent ? this._parent.dom : null);
		},
		get headers() {
			return this._options.headers;
		},
		hide: function() {
			(this._elements.form && (this._elements.form.visible = false));
			return this;
		},
		get locale() {
			return this._i18n._id;
		},
		set locale(value) {
			// Use en_GB as fallback for untranslated values
			return (this._i18n = Object.assign({ _id: (FileFunnel.i18n[value] ? value : "en_GB") }, FileFunnel.i18n.en_GB, FileFunnel.i18n[value]))._id;
		},
		on: function(events, callback) {
			// Accept single event or array of events
			(events instanceof Array ? events : [ events ])
			.forEach(function(event) {
				// Validate event name, or throw exception
				if(-1 == [ "start", "progress", "success", "abort", "error", "reset" ].indexOf(event)) {
					throw "Unrecognized FileFunnel event: " + event;
				}

				// Add event callback if valid function, otherwise unset
				this._callbacks[event] = ("function" == typeof callback ? callback : null);
			}, this);

			return this;
		},
		reset: function() {
			(this._elements.form && this._elements.form.dom.reset());
		},
		resize: function(width) {
			(this._elements.form && this._parent && (this._elements.form.dom.style.width = (isNaN((width = Number(width))) ? this._parent.dom.offsetWidth : width) + "px"));
			return this;
		},
		get server() {
			return ("string" == typeof this._options.server ? this._options.server : null);
		},
		set server(uri) {
			return (this._options.server = ("string" == typeof uri ? uri : null));
		},
		show: function() {
			(this._elements.form && (this._elements.form.visible = true));
			return this;
		},
		toggle: function () {
			(this._elements.form && (this._elements.form.visible = !this._elements.form.visible));
			return this;
		},
		upload: function() {
			// Overwritten by build-method
		}
	};

	// Default locale settings
	FileFunnel.i18n = {
		en_GB: {
			// Button labels
			add:            "Add files",
			browse:         "Choose file",
			cancel:         "Cancel",
			delete:         "Delete",
			reset:          "Reset",
			upload:         "Upload",
			previewOpen:    "Maximise preview in new window",
			previewClose:   "Close preview",

			// Size indicators
			bytes:          " bytes",
			gibiBytes:      " GiB",
			kibiBytes:      " KiB",
			mebiBytes:      " MiB",

			// Placeholder texts
			fileName:       "Filename",
			fileSize:       "Unknown size",
			fileType:       "Unrecognised filetype",

			// Status indicators
			aborted:        "Upload aborted",
			exists:         "File already exists",
			failed:         "Upload failed",
			forbidden:      "Unauthorised for upload",
			invalidName:    "Invalid filename",
			oversized:      "File too big for upload",
			processing:     "Processing, please wait...",
			refused:        "Connection refused",
			success:        "Upload successful",
			timeout:        "Upload timed out",
			unsupported:    "Unsupported filetype",
			unprocessable:	"File unprocessable by server"
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
