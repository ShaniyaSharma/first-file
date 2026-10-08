// ============ VALIDATION FUNCTIONS ============

// Validate Name (Only letters and spaces)
export const ValidName = (value) => {
    const regex = /^[a-zA-Z\s]+$/;
    return regex.test(value);
};

// Validate Email
export const ValidEmail = (value) => {
    const regex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    return regex.test(value);
};

// Validate Password (8+ chars, uppercase, lowercase, number, special char)
export const ValidPassword = (value) => {
    const regex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
    return regex.test(value);
};

// Validate Phone (10 digits)
export const ValidPhone = (value) => {
    const regex = /^[0-9]{10}$/;
    return regex.test(value);
};

// Validate OTP (6 digits)
export const ValidOTP = (value) => {
    const regex = /^[0-9]{6}$/;
    return regex.test(value);
};

// Validate Pincode (6 digits)
export const ValidPincode = (value) => {
    const regex = /^[0-9]{6}$/;
    return regex.test(value);
};

// Validate Gender
export const ValidGender = (value) => {
    const regex = /^(male|female|other)$/i;
    return regex.test(value);
};

// Validate URL
export const ValidURL = (value) => {
    try {
        new URL(value);
        return true;
    } catch {
        return false;
    }
};

// Validate Date (YYYY-MM-DD)
export const ValidDate = (value) => {
    const regex = /^\d{4}-\d{2}-\d{2}$/;
    return regex.test(value);
};

// Validate AlphaNumeric
export const ValidAlphaNumeric = (value) => {
    const regex = /^[a-zA-Z0-9\s]+$/;
    return regex.test(value);
};

// Validate City (Only letters and spaces)
export const ValidCity = (value) => {
    const regex = /^[a-zA-Z\s]{2,50}$/;
    return regex.test(value);
};

// Validate State (Only letters and spaces)
export const ValidState = (value) => {
    const regex = /^[a-zA-Z\s]{2,50}$/;
    return regex.test(value);
};

// Validate Country
export const ValidCountry = (value) => {
    const regex = /^[a-zA-Z\s]{2,50}$/;
    return regex.test(value);
};

// Validate Address
export const ValidAddress = (address) => {
    if (!address || typeof address !== 'object') return false;
    const { street, city, state, pincode, country } = address;
    
    return street && 
           street.length >= 5 && 
           ValidCity(city) && 
           ValidState(state) && 
           ValidPincode(pincode) && 
           ValidCountry(country || 'India');
};

// Validate Product Name
export const ValidProductName = (value) => {
    const regex = /^[a-zA-Z0-9\s\-_,.!?()]{3,100}$/;
    return regex.test(value);
};

// Validate Price
export const ValidPrice = (value) => {
    const regex = /^\d+(\.\d{1,2})?$/;
    return regex.test(value) && parseFloat(value) > 0;
};

// Validate Quantity
export const ValidQuantity = (value) => {
    const regex = /^[1-9]\d*$/;
    return regex.test(value);
};

// ============ DEFAULT EXPORT ============
export default {
    ValidName,
    ValidEmail,
    ValidPassword,
    ValidPhone,
    ValidOTP,
    ValidPincode,
    ValidGender,
    ValidURL,
    ValidDate,
    ValidAlphaNumeric,
    ValidCity,
    ValidState,
    ValidCountry,
    ValidAddress,
    ValidProductName,
    ValidPrice,
    ValidQuantity
};