const Joi = require('joi')

module.exports = Joi.object({
    ip: Joi.string()
})