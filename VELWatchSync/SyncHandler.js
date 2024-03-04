
//Used to convert from arraybuffer to string
const sleep = (delay) => new Promise((resolve) => setTimeout(resolve, delay))
function getIPFromAmazon() {
    fetch("https://checkip.amazonaws.com/",{mode: 'no-cors'}).then(res => res.text()).then(data => {station_id = data})
}

function ab2str(buf) {
    return String.fromCharCode.apply(null, new Uint8Array(buf));
}
var fromTime;
var buffer = [];
var mac_id = "c8:6c:ec:ca:0c:6a";
var station_id = "c8:6c:ec:ca:0c:6a";
var sendToServer = false;
var nameFound
var batteryFound
var rssiFound
//Used to convert from string to arraybuffer
function str2ab(str) {
    var buf = new ArrayBuffer(str.length);
    var bufView = new Uint8Array(buf);
    for (var i=0, strLen=str.length; i<strLen; i++) {
        console.log(str.charCodeAt(i))
        bufView[i] = str.charCodeAt(i);
        console.log(bufView[i])
    }
    return buf;
}
if (typeof navigator == "undefined"){
    console.log("not working :(");
}

var isBusy = false;
var d = new Date();
function sendReq(){
    const bodyData = new URLSearchParams({
        name: "VelWatch",
        battery: 50,
        rssi: -90,
        station_id: station_id,
        device_id: station_id
    });
    fetch("https://bbs.ugavel.com/discovered", {
            body: bodyData,
            method: "POST",
            headers: {
                "Content-type": "application/x-www-form-urlencoded"
            }
            });
}
//instantiating the web bluetooth handler to take care of tx and rx communications and maintain the connection
function start(){
    connection = connect(function () {
        connection.received = "";
        connection.on('data', function (d) {
            connection.received += d;
            connection.hadData = true;
            if (connection.cb) connection.cb(d);
        });
        connection.on('close', function (d) {
            connection = undefined;
        });
        isBusy = true;
        connection.write(data, onWritten);
    });
    console.log(WebBluetooth.isSupported())
}
var WebBluetooth = {
    name : "Web Bluetooth",
    description : "Bluetooth LE devices",
    svg : '<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24"><path d="M0 0h24v24H0z" fill="none"/><path d="M17.71 7.71L12 2h-1v7.59L6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 11 14.41V22h1l5.71-5.71-4.3-4.29 4.3-4.29zM13 5.83l1.88 1.88L13 9.59V5.83zm1.88 10.46L13 18.17v-3.76l1.88 1.88z" fill="#ffffff"/></svg>',
    isSupported : function() {
        if (navigator.platform.indexOf("Win")>=0 &&
            (navigator.userAgent.indexOf("Chrome/54")>=0 ||
                navigator.userAgent.indexOf("Chrome/55")>=0 ||
                navigator.userAgent.indexOf("Chrome/56")>=0)
        )
            return "Chrome <56 in Windows has navigator.bluetooth but it's not implemented properly";;
        if (window && window.location && window.location.protocol=="http:" &&
            window.location.hostname!="localhost")
            return "Serving off HTTP (not HTTPS) - Web Bluetooth not enabled";
        if (navigator.bluetooth) return true;
        var iOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
        if (iOS) {
            return "To use Web Bluetooth on iOS you'll need the WebBLE App.\nPlease go to https://itunes.apple.com/us/app/webble/id1193531073 to download it.";
        } else {
            return "This Web Browser doesn't support Web Bluetooth.\nPlease see https://www.espruino.com/Puck.js+Quick+Start";
        }
    },
    connect : function(connection, callback) {
        //Defining general variables and the serial service specific to the bangle.js firmware
        var NORDIC_SERVICE = "6e400001-b5a3-f393-e0a9-e50e24dcca9e";
        var NORDIC_TX = "6e400002-b5a3-f393-e0a9-e50e24dcca9e";
        var NORDIC_RX = "6e400003-b5a3-f393-e0a9-e50e24dcca9e";
        var btServer = undefined;
        var btService;
        var connectionDisconnectCallback;
        var txCharacteristic;
        var rxCharacteristic;
        //Queue used to handle the data that will be sent on the tx channel
        var flowControlXOFF = false;
        var chunkSize = 20;
        var counter = 0;

        //Function used to close the bluetooth connection on the site side (makes sure all the variables are set to undefined essentially allowing for a fresh start if needed)
        connection.close = function (callback) {
            connection.isOpening = false;
            if (connection.isOpen) {
                connection.isOpen = false;
                connection.emit('close');
            } else {
                if (callback) callback(null);
            }
            if (btServer) {
                btServer.disconnect();
                btServer = undefined;
                txCharacteristic = undefined;
                rxCharacteristic = undefined;
            }
        };

        //Function that handles the writing of the data on the tx channel (used after the server variable has been instantiated and the txCharacteristic has been set)
        connection.write = function (val) {
            //Adds data used to the txqueue to be sent
            if (connection.isOpen && !connection.txInProgress){
                writeChunk(val)
            }

            function writeChunk(data) {
                //Prevents the writing of data if Flow control is set to off (will wait 50 then retry to check if Flow Control has been turned on)
                if (flowControlXOFF) { // flow control - try again later
                    setTimeout(writeChunk, 50);
                    return;
                }
                //Prevents the writing of data and ends the write process if there is nothing in the queue

                //If the next item can be written in one chunk it is set to be sent
                chunk = data;
                data = undefined;
                //Ensures the rest of the program can recognize that the program is sending data over tx, so it does not start any processes that could sabotage the writing
                connection.txInProgress = true;
                console.log(2, "Sending " + JSON.stringify(chunk));
                //Writes the saved chunk to the bluetooth server on the corresponding device in the form of an array buffer
                txCharacteristic.writeValue(new Uint16Array([chunk]).buffer).then(function () {
                    console.log(3, "Sent");
                    connection.txInProgress = false;
                    if(chunk == 5){
                        //connection.close();
                    }
                }).catch(function (error) {
                    
                    console.log(1, 'SEND ERROR: ' + error);
                    connection.close();
                });
                
            }
        };
        //Searches for external bluetooth devices with the specified parameters
        navigator.bluetooth.requestDevice({
            filters:[
                { namePrefix: 'VELWatch' },
                { services: [ NORDIC_SERVICE ] }
            ], optionalServices: [ NORDIC_SERVICE ]}).then(function(device) {
                mac_id = device.id;
                mac_id = mac_id.toString();
                nameFound = device.name;
                console.log(device.advertisement)
            console.log(1, 'Device Name:       ' + nameFound);
            console.log(1, 'Device ID:         ' + mac_id);
            console.log(1, 'Device battery:         ' + batteryFound);
            console.log(1, 'Device rssi:         ' + rssiFound);
            //Calls the close function in the event of a gatt server disconnection
            device.addEventListener('gattserverdisconnected', function() {
                console.log(1, "Disconnected (gattserverdisconnected)");
                connection.close();
            });
            //Attempts to connect to the bluetooth server on the chosen device
            return device.gatt.connect();
        }).then(function(server) {
            console.log(1, "Connected");
            btServer = server;
            return btServer.getPrimaryService(NORDIC_SERVICE);
        }).then(function(service) {
            console.log(2, "Got service");
            btService = service;
            //Saves the RX Characteristic used in the connection with the server in order to receive on the RX channel for the site
            return btService.getCharacteristic(NORDIC_RX);
        }).then(function (characteristic) {
            rxCharacteristic = characteristic;
            console.log( "RX characteristic");
            //Will execute on the reading of a packet in order to parse it for the pause signal to stop the process
            rxCharacteristic.addEventListener('characteristicvaluechanged', function(event) {
                console.log("Added Listen");
                var dataview = event.target.value;
                    for (var i=0;i<dataview.byteLength;i++) {
                        var ch = dataview.getUint8(i);
                        if(ch==2){
                            console.log("finished sync");
                            const file = JSON.stringify(dataview);
                            buffer.push(ch);
                            sendToServer = true;
                        }
                        else if(ch == 7){
                            console.log("7")
                            num1 = dataview.getUint8(i+4)
                            num2 = dataview.getUint8(i+3)
                            num3 = dataview.getUint8(i+2)
                            num4 = dataview.getUint8(i+1)
                            fromTime = num1.toString() + num2.toString() + num3.toString() + num4.toString()
                        }
                        else if(ch == 10){
                            buffer.push("\n")
                        }
                        else{
                            buffer.push(ch);
                        }
                        //connection.write(1);
                    }
                    
                var str = ab2str(dataview.buffer);
                    //send to server
                if(sendToServer){
                    connection.close();
                    const http = new XMLHttpRequest();
                    const currentDate = new Date();
                    console.log(mac_id)
                    from_time = currentDate.getTime();
                    station_mac = station_id;
                    device_mac = mac_id;
                    app_name = "hrv_test";
                    app_version = 6;
                    complete = 1;
                    sync_route = "https://bbs.ugavel.com/sync"
                    let urlEncoded = `?from_time=${from_time}&station_id=${station_mac}&device_id=${device_mac}&app_name=${app_name}&app_version=${app_version}&complete=${complete ? '1' : '0'}`;
                    http.open('POST', sync_route + urlEncoded);
                    http.setRequestHeader('Content-Type', 'application/octet-stream');
                    http.send(buffer, 0);
                    sendToServer = false;
                }else{
                    if(counter < 10){
                        counter += 1;
                    }
                    else{
                        counter = 0;
                        connection.write(1);    
                    }
                }
                console.log(3, "Received "+JSON.stringify(str));
                //connection.emit('data', str);
            });
            return rxCharacteristic.startNotifications();
        }).then(function() {
            //Saves the TX Characteristic, so it can be used to send packets in the write function of the connection
            console.log("geting tx");
            return btService.getCharacteristic(NORDIC_TX);
        }).then(function (characteristic) {
            txCharacteristic = characteristic;
            console.log(2, "TX characteristic:"+JSON.stringify(txCharacteristic));
            //Readies the connection to begin the writing process
        }).then(function() {
            console.log("setting");
            connection.txInProgress = false;
            connection.isOpen = true;
            connection.isOpening = false;
            isBusy = false;
            const bodyData = new URLSearchParams({
                name: nameFound,
                battery: batteryFound,
                rssi: rssiFound,
                station_id: station_id,
                device_id: mac_id
            });
            fetch("https://bbs.ugavel.com/discovered", {
                    body: bodyData,
                    method: "POST",
                    headers: {
                        "Content-type": "application/x-www-form-urlencoded"
                    }
                    }).then(response => {
                        if (!response.ok) {
                            throw new Error('Network response was not ok');
                        }
                        return response.json(); // assuming the response is in JSON format
                    })
                    .then(data => {
                        // Handle the response data here
                        console.log(data);
                    })
            connection.write(1);
        }).catch(function(error) {
            console.log(1, 'ERROR: ' + error);
            connection.close();
        });
        return connection;
    }
};


function connect(callback) {
    var connection = {
        on : function(evt,cb) { this["on"+evt]=cb; },
        emit : function(evt,data) { if (this["on"+evt]) this["on"+evt](data)
            console.log("emit"); },
        isOpen : false,
        isOpening : true,
        txInProgress : false
    };
    connection = WebBluetooth.connect(connection, callback);
    return connection;
}