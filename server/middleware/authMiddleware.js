const jwt = require('jsonwebtoken');
const protect = (req, res, next) => {
    let token;
    if (
        req.headers.authorization &&
        req.headers.authorization.startsWith('Bearer')
    ) {
        try {
            token = req.headers.authorization.split(' ')[1];
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            req.user = { id: decoded.id };
            return next();
        } catch (error) {
            console.error('Token verification failed:', error.message);
            return res.status(401).json({ message: 'Token verification failed' });
        }
    }

    return res.status(401).json({ message: 'No token provided' });
};

module.exports = { protect };
