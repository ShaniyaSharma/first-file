export const allError = (err, req, res, next) => {
  console.error("Error:", err.message);
  
  if (err.name === "ValidationError") {
    return res.status(400).json({ 
      success: false, 
      message: Object.values(err.errors).map(e => e.message).join(", ") 
    });
  }
  
  if (err.code === 11000) {
    return res.status(409).json({ 
      success: false, 
      message: `${Object.keys(err.keyPattern)[0]} already exists` 
    });
  }
  
  if (err.name === "CastError") {
    return res.status(400).json({ 
      success: false, 
      message: `Invalid ${err.path}: ${err.value}` 
    });
  }
  
  if (err.name === "JsonWebTokenError") {
    return res.status(401).json({ 
      success: false, 
      message: "Invalid token" 
    });
  }
  
  if (err.name === "TokenExpiredError") {
    return res.status(401).json({ 
      success: false, 
      message: "Token expired. Please login again." 
    });
  }
  
  return res.status(err.status || 500).json({ 
    success: false, 
    message: err.message || "Internal Server Error" 
  });
};