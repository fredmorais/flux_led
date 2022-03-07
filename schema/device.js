const Joi = require('joi')

module.exports = Joi.object({
    ip: Joi.string().ip({ version: 'ipv4' }).required(),

    mac: Joi.string().required()
})