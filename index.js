const Plugin = require('../../database/plugin/index')
const { Control, Discovery } = require('magic-home')


class FluxLED extends Plugin {

    constructor() {
        super()
        this.dir = __dirname
        this.nameStylized = 'Flux LED'
    }

    // Required functions
    
    async load(device) {

        // Create controller
        const controller = new Control(device.ip, { ack: Control.ackMask({
            power: true,
            color: true,
            pattern: false,
            custom_pattern: false
        }) })

        await controller.queryState()
        .then(async data => {
            await this.functions.sleep(1000)
            await this.connection(device, { success: true }, controller)
        })
        .catch(error => this.connection(device, {
            success: false,
            error: error.code
        }))

    }

    async get(device) { 

        // Refresh device
        await device.controller.queryState()
        .then(data => {
            // Format color
            const formatRGB = this.functions.rgbToHex(data.color.red, data.color.green, data.color.blue, true, true)
            
            var characteristics = { power: data.on, brightness: formatRGB.brightness, color_rgb: formatRGB.hex }
            
            // Add characteristics to device and set last updated
            device.characteristics = characteristics
        })
        .catch(error => { throw new Error(error)})

    }
    
    async set(device, controls) {

        // If power is false just turn device off
        if (controls.power == false) {
            await device.controller.setPower(false)
        // Else if power is true iterate through all controls
        } else {
            if (controls.power == true) {
                await device.controller.setPower(true)
            }

            if (controls.brightness && !controls.color_rgb) {
                const rgb = this.functions.hexToRgb(device.characteristics.color_rgb, controls.brightness)
                await device.controller.setColorWithBrightness(...rgb, controls.brightness)
            } else if (!controls.brightness && controls.color_rgb) {
                const rgb = this.functions.hexToRgb(controls.color_rgb, device.characteristics.brightness)
                await device.controller.setColorWithBrightness(...rgb, device.characteristics.brightness)
            } else if (controls.brightness && controls.color_rgb) {
                const rgb = this.functions.hexToRgb(controls.color_rgb, controls.brightness)
                await device.controller.setColorWithBrightness(...rgb, controls.brightness)
            }
        }

        await this.functions.sleep(700)

    }

    // Optional functions

    async scan(timeout) {

        const updatedList = []

        // Create new scanner object and scan
        this.scanner = new Discovery()
        await this.scanner.scan(timeout)
        .catch(error => { throw new Error(error) })
        .then(async scannedDevices => {

            // Iterate scanned devices
            for (var device of scannedDevices) {
    
                // If device's mac is in ignore list, skip iteration
                if (this.settings.ignoreMacs.includes(device.id)) {
                    continue
                }
    
                // Get device
                var dev = this.devices.find(dev => dev.mac == device.id)
                
                // If device already exists and has different ip, update it
                if (dev && dev.ip != device.address) {                    

                    const updated = this.wrapperUpdate(dev, { ip: device.address })

                    const controller = new Control(updated.ip, { ack: Control.ackMask({
                        power: true,
                        color: true,
                        pattern: false,
                        custom_pattern: false
                    }) })

                    await controller.queryState()
                    .then(async data => {
                        updatedList.push(updated)
                        await this.connection(updated, { success: true }, controller)
                    })

                // If device does not exist add to discovered list
                } else if (!dev) {
    
                    this.discovered.push({
                        plugin: this.name,
                        name: 'Discovered Device',
                        type: 'light_rgb',
                        ip: device.address,
                        mac: device.id,
                    })
    
                }
                
            }
        })

        return updatedList

    }

}


module.exports = FluxLED