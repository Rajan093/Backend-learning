import { ApiError } from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import jwt from "jsonwebtoken"
import { User } from "../models/user.model.js";

export const verifyJWT = asyncHandler(async(req, _, next) => {
    try {
        const token = req.cookies?.accessToken || req.header("Authorization")?.replace("Bearer ", "")
        
        // console.log(token);
        if (!token) {
            throw new ApiError(401, "Unauthorized request")
        }
    
        // TL;DR: JWTs have 3 parts: header.payload.signature
        // 1. The signature matches (to confirm token is untampered)
        // 2. The token is not expired
        // 3. Then returns the decoded payload
        const decodedToken = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET)

        
    
        const user = await User.findById(decodedToken?._id).select("-password -refreshToken")
    
        if (!user) {  
            throw new ApiError(401, "Invalid Access Token")
        }
    
        // adding user object in the req so that in logoutUser we can access user data
        req.user = user;
        next()
    } catch (error) {
        throw new ApiError(401, error?.message || "Invalid access token")
    }
    
})