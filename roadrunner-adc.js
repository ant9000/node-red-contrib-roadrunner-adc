module.exports = function(RED) {
    "use strict";
    RED.log.info("rr-adc : initializing.");
    var fs = require('fs');

    var initOK = true;
    try {
        var cpuinfo = fs.readFileSync("/proc/cpuinfo").toString();
        if (cpuinfo.indexOf(": Atmel SAMA5") === -1) {
            initOK = false;
            RED.log.warn("rr-adc : RoadRunner CPU not detected");
        } else {
            try {
                fs.accessSync('/sys/bus/iio/devices/iio\:device0/', fs.constants.R_OK)
            } catch(err) {
                initOK = false;
                RED.log.warn("rr-adc : /sys/bus/iio/devices/iio\:device0/ is not readable by user "+process.env.USER);
            }
        }
    } catch(err) {
        initOK = false;
        RED.log.warn("rr-adc : RoadRunner detection failed");
    }

    function ADCNode(config) {
        RED.nodes.createNode(this,config);
        this.buttonState = -1;
        this.adc = config.adc;
        var node = this;

        if (!initOK) {
            node.status({fill:"grey",shape:"dot",text:"node inactive"});
            return;
        }

        node.on('input', function (msg) {
            var adc = null;
            if (node.adc === "M") {
                var payload = parseInt(msg.payload.toString());
                if ((payload >= 0) && (payload < 11)) { adc = payload; }
                else { node.warn("Payload needs to select channel 0 to 11"); }
            } else {
                adc = parseInt(node.adc);
            }
            if (adc !== null) {
                try {
                    var value = fs.readFileSync("/sys/bus/iio/devices/iio\:device0/in_voltage"+adc+"_raw").toString();
                    node.send({payload:value, topic:"rr-adc/"+adc});
                } catch(err) {
                    node.warn("Read error: "+err);
                }
            }
        });
    }
    RED.nodes.registerType("rr-adc in",ADCNode);

    if (initOK) {
        RED.log.info("rr-adc : initialization complete.");
    } else {
        RED.log.warn("rr-adc : node inactive");
    }
}
