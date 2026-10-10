const jwt = require('jsonwebtoken');

const generateToken = (userId, res) => {
    const token = jwt.sign({ id: userId }, process.env.JWT_SECRET, {
        expiresIn: '15d',
    });

    res.cookie('jwt', token, {
        maxAge: 15*24*60*60*1000,  
        httpOnly: true,  
        sameSite: 'strict',  
        // 15 days in milliseconds
    });
};


module.exports = generateToken;