const Joi = require('joi')

module.exports = Joi.object({
    ignoreMacs: Joi.array()
})