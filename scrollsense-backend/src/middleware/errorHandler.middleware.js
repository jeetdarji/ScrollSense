const errorHandler = (err, req, res, next) => {
  console.error(err);

  // Mongoose Validation Error
  if (err.name === 'ValidationError') {
    const details = Object.values(err.errors).map(val => val.message);
    return res.status(400).json({ error: 'Validation failed', details });
  }

  // Mongoose Cast Error (invalid ObjectId)
  if (err.name === 'CastError') {
    return res.status(400).json({ error: 'Invalid ID format' });
  }

  // JWT Errors
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({ error: 'Invalid token' });
  }
  
  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({ error: 'Token expired', code: 'TOKEN_EXPIRED' });
  }

  // Default server error
  const response = {
    error: err.message || 'Internal server error',
  };

  if (process.env.NODE_ENV === 'development') {
    response.dev = { stack: err.stack };
  } else {
    response.error = 'Internal server error'; // sanitize output in prod
  }

  res.status(err.status || 500).json(response);
};

module.exports = errorHandler;