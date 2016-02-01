# filefunnel.js
File Upload JavaScript Widget

## Usage:
FileFunnel is added to HTML elements by creating a new instance of **FileFunnel** using a CSS selector string as the first parameter, and optionally a map of settings as the secondd parameter. If the target element is a *HTMLInputElement*, FileFunnel will be added as a widget (only visible on demand), otherwise FileFunnel will act as a permanent application added to the target element:

```javascript
// Append FileFunnel with specified settings to the first div element found
new FileFunnel("div", {
  accept: "image/png, image/jpeg",    // Accept PNG and JPEG images only
  chunked: true,                      // Enable chunked uploading
  locale: "en_US",                    // Use american english as locale
  multiple: true,                     // Enable upload of multiple files
  server: "https://localhost:3751"    // Server backend accepting files
});

// Add FileFunnel as a widget to the first input element with a 'filefunnel' attribute
new FileFunnel("input[filefunnel]", {
  autoResize: true,                   // Enable automatic resizing of the widget
  chunked: true,                      // Enable chunked uploading
  server: "https://localhost:3751"    // Server backed accepting files
});
```

#### Constructor options:
Key               | Value                                                         | Default
------------------|---------------------------------------------------------------|-------------------------
**accept**        | Comma-separated list of acceptable MIME types (client side)   | *&#42;/&#42; (any type)*
**auth**          | Authorization header contents as string (enables credentials) | *null*
**autoResize**    | Enable automatic widget resizing based on parent width        | *true*
**chunked**       | Enable chunked uploading                                      | *false*
**chunkSize**     | Chunk byte size for chunked uploading                         | *1048576 (1 MiB)*
**className**     | Dot-separated CSS class names added to form                   | *.filefunnel*
**credentials**   | Enable requests with credentials/cookies                      | *false*
**emptyNames**    | Allow empty file names to be uploaded (client side)           | *false*
**headers**       | Map of additional request headers to be set                   | *{ } (no headers)*
**locale**        | Name of locale (or *null* for browser locale)                 | *null*
**maxSize**       | Maximum acceptable file byte size (client side)               | *Infinity*
**multiple**      | Enable support for multiple files                             | *false*
**progress**      | Enable progress tracking of non-chunked uploads               | *false*
**server**        | URI to server backend receiving the uploaded files            | *null*

#### Methods:
Method     | Parameters              | Description
-----------|-------------------------|-------------------------------------------------------------------------
**abort**  | *none*                  | Abort any upload in progress
**browse** | *none*                  | Show the file selection dialogue
**build**  | *none*                  | Rebuild the form with new settings
**hide**   | *none*                  | Hide the form/widget
**on**     | **event**, **callback** | Add/replace **callback** function to specified **event**
**reset**  | *none*                  | Clear files from file upload queue
**resize** | **width**               | Resize the form to given **width** (or parent width if no width is specified)
**show**   | *none*                  | Show the form/widget
**toggle** | *none*                  | Toggle form/widget visibility
**upload** | *none*                  | Start uploading of previously selected files

#### Events:
The following is a list of events which can trigger a callback function added by the **on** method:

Event name   | Description
-------------|------------------------------------------------------
**abort**    | Triggered when the upload was aborted by the user
**error**    | Triggered when any errors occur during upload
**progress** | Triggered when a file upload progresses
**start**    | Triggered when the upload was initialised by the user
**success**  | Triggered when a file was successfully uploaded

#### Locale settings:
By default, only the **en_GB** locale is included, but all available translations can be enabled by including the [filefunnel-i18n.min.js](https://github.com/npolar/filefunnel.js/tree/master/dist/js/filefunnel-i18n.min.js) file. Unless otherwise specified, the browser locale will be used if the translation exists, otherwise **en_GB** is used as a fallback.

To manually enable individual locales, include the corresponding file located in [dist/js/filefunnel-i18n/](https://github.com/npolar/filefunnel.js/tree/master/dist/js/filefunnel-i18n).

## Contribution:
Contributing to the project is encouraged, and any help is appreciated. Even if you are not familiar with JavaScript, you can still contribute to the project by adding translations, or stylesheet extensions for aesthetical improvements. If you experience any bugs or have any suggestions for improvements, feel free to file an [issue](https://github.com/npolar/filefunnel.js/issues).

#### Prerequisites:
First, install [git](https://git-scm.com/) and [node](https://nodejs.org)/[npm](https://npmjs.com) so you can download the required source files and dependencies. Afterwards, run the following commands to clone the repository, and automatically install the required developer dependencies:

```sh
git clone https://github.com/npolar/filefunnel.js.git
cd filefunnel.js && npm install
```

#### Language contributions:
After cloning the project, you can add new translations to the [src/i18n](https://github.com/npolar/filefunnel.js/tree/master/src/i18n) directory, using one of the existing files in the same directory as a template. Please keep the same file name format as used by other translations. The JavaScript object containing all translations should be named using the full **language**_**TERRITORY** format (e.g. en_US). Abbreviations, if existent and standardised, can be added to the bottom of the file, such as:

> FileFunnel.i18n.**en** = FileFunnel.i18n.**en_US**;

After adding translation source files to the **src/i18n** directory, do **not** try to manually generate the distributed versions (i.e. files located in the **dist/** directory). These files are generated automatically by running the following command:

```sh
gulp
```

## Backend support:
FileFunnel currently supports two methods of file uploading, namely *form-data* and *chunked* as descibed below.
While *form-data* support is easier to implement on the backend, *chunked* allows for more flexibility.
Both of these utilise the **POST** method. Note that *progress tracking* will preflight the request with a **OPTIONS** header which has to be dealt with by the server for *chunked* uploads and *form-data* uploads with progress.

#### Form-Data upload:
The simplest form of backend implementation is achieved by supporting the **multipart/form-data** *Content-Type* for non-chunked uploads.
All files are then uploaded in the same request body, with the file name specified as the form field name.

The following is a list of some limitations with this kind of upload:
 * No support for huge files, as the *total* acceptable size of *all files* is limited by the maximum supported body length
 * Inaccurate progress bars, as there is no way of telling how many bytes of each file has been uploaded
 * No support for status indicators on a per-file basis (i.e. individual success or failure indicators)
 * No standardised feedback on resulting location of successfully uploaded files (i.e. *Content-Location* headers)

#### Chunked upload:
Adding support for chunked uploads is a bit more complicated than for form-data uploads, but gives a more accurate progress bar on individual files, and allows for bigger file sizes.
The nature of chunked upload also allows for more accurate error messages if a file could not be successfully uploaded.

In order to accept chunked uploads, the following two headers must be accepted:
 * **X-File-Name** containing the file name of the current file being uploaded
 * **X-File-Size** containing the byte size of the current file being uploaded

File chunks are sent in the *correct order* so it should be easy to reassemble the files after all chunks has been received.
By using the custom **X-File-Size** header, the server can know that the complete file has been received when the *total* number of bytes of *all chunks* matches the value of the header.
The MIME type of the file being uploaded can be accessed by the **Content-Type** header, and the size of individual chunks is stored in the **Content-Length** header.

For more verbose output to the user, the following status codes *may* be used:

Code    | Status message           | Description
--------|--------------------------|-----------------------------------------------------------------------------------
**201** | *Created*                | Indicates that the complete file has been received and saved
**202** | *Accepted*               | Indicates that a chunk was successfully received
**401** | *Unauthorized*           | Indicates that the user must be authenticated in order to upload
**403** | *Forbidden*              | Indicates that the user does not have the sufficient rights to upload
**409** | *Conflict*               | Indicates that the file already exists on the server (and duplicates are rejected)
**412** | *Precondition Failed*    | Indicates that the header described in the *Vary* header is missing/erroneous
**413** | *Payload Too Large*      | Indicates that the file is too big to be accepted
**415** | *Unsupported Media Type* | Indicates that the file is of a media type not accepted by the server

Status code **412** is also used to indicate that the *filename* is *missing/erroneous*.

All status codes in the **2xx**-range are treated as **success**, while codes in the **4xx** and **5xx** -ranges are treated as **errors**.
Status codes in the **3xx**-range are currently not handled by the FileFunnel client.

For *Cross-Origin Resource Sharing* (**CORS**) to work properly, the following headers must be set:

Header                               | Value
-------------------------------------|----------------------------------------------------------
**Access-Control-Allow-Credentials** | **true** *(if requests with credentials are allowed)*
**Access-Control-Allow-Headers**     | **Authorization, Content-Type, X-File-Name, X-File-Size**
**Access-Control-Allow-Origin**      | *(comma-separated list of accepted origin URIs)*
**Access-Control-Expose-Headers**    | **Content-Location**

Note that the **Access-Control-Allow-Origin**-header can be set to **&#42;** (asterisk) in order to accept *any origin*,
however, this is **not allowed** for *requests with credentials* (i.e. cookies and/or authorization).
