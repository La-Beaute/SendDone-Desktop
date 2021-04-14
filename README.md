# SendDone-Desktop
This is a reporitory for SendDone, desktop version.<br>

## How to Run Debug
```bash
# Run react in localhost.
npm start
# Electron will load web page the above.
npm run electron
```

## How to Build in Production
```bash
# Option 1.
# Run react build
npm build
# electron-builder will build into executables or installers. Refer to its document for detail.
npx electron-builder --win --x64

# Option 2.
# Execute above with one npm script.
npm run builder
```

## networking
`src/networking.js` is the underline implementation of TCP networks and file write and read.<br>
Receiver always opens a server socket, and sender always connects to the server socket as a client.<br>
Why? Because that is easier and more natural than the opposite way.<br>
Think of a mouth and an ear. Mouth always initiate communication, and ear responds to the mouth.<br> 
To communicate at any arbitrary time, ear has to be open always, while mouth does not have to be.
<br>

### Send
Sender connect to receiver and sends the following data first.
```text
SendDone\n
0.1.0\n
type:send\n
length:4\n
name:file_1\n
type:file\n
name:file_2\n
type:file\n
name:sub_directory\n
type:directory\n
name:sub_directory/file_3\n
type:file\n\n
```
Next, if receiver approves seeing the list, sender sends each element.<br>
If the element type is file, first send the file metadata.
```text
name:file_1\n
type:file\n
size:1000\n\n
```
Else if the element is directory,
```text
name:sub_directory\n
type:directory\n\n
```
Then, sender waits for receiver to send `ok` sign. This is to handle user inputs and to distinguish element's metadata and actual data.<br>
