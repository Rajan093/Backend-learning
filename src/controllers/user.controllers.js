import { asyncHandler } from "../utils/asyncHandler.js";
import {ApiError} from "../utils/ApiError.js"
import { User} from "../models/user.model.js"
import {deleteOnClodinary, uploadOnCloudinary} from "../utils/cloudinary.js"
import { ApiResponse } from "../utils/ApiResponse.js";


const generateAccessAndRefereshTokens = async(userId) =>{
    try {
        const user = await User.findById(userId)
        const accessToken = user.generateAccessToken()
        const refreshToken = user.generateRefreshToken()

        user.refreshToken = refreshToken
        await user.save({ validateBeforeSave: false })

        return {accessToken, refreshToken}


    } catch (error) {
        throw new ApiError(500, "Something went wrong while generating referesh and access token")
    }
}


const registerUser = asyncHandler( async (req, res) => {
    // get user details from frontend
    // validation - not empty
    // check if user already exists: username, email
    // check for images, check for avatar
    // upload them to cloudinary, avatar
    // create user object - create entry in db
    // remove password and refresh token field from response
    // check for user creation
    // return res


    const {fullName, email, username, password } = req.body
    //console.log("email: ", email);

    if (
        [fullName, email, username, password].some((field) => field?.trim() === "")
    ) {
        throw new ApiError(400, "All fields are required")
    }

    const existedUser = await User.findOne({
        $or: [{ username }, { email }]
    })


    if (existedUser) {
        throw new ApiError(409, "User with email or username already exists")
    }
    //console.log(req.files);

    const avatarLocalPath = req.files?.avatar[0]?.path;
    //const coverImageLocalPath = req.files?.coverImage[0]?.path;

    let coverImageLocalPath;
    if (req.files && Array.isArray(req.files.coverImage) && req.files.coverImage.length > 0) {
        coverImageLocalPath = req.files.coverImage[0].path
    }
    

    if (!avatarLocalPath) {
        throw new ApiError(400, "Avatar file is required")
    }

    const avatar = await uploadOnCloudinary(avatarLocalPath)
    const coverImage = await uploadOnCloudinary(coverImageLocalPath)

    if (!avatar) {
        throw new ApiError(400, "Avatar file is required")
    }
   

    const user = await User.create({
        fullName,
        avatar: avatar.url,
        avatarId: avatar.public_id,
        coverImage: coverImage?.url || "",
        coverImageId: coverImage?.public_id || "",
        email, 
        password,
        username: username.toLowerCase()
    })

    const createdUser = await User.findById(user._id).select(
        "-password -refreshToken"
    )

    if (!createdUser) {
        throw new ApiError(500, "Something went wrong while registering the user")
    }

    return res.status(201).json(
        new ApiResponse(200, createdUser, "User registered Successfully")
    )

} )

const loginUser = asyncHandler( async (req , res) => {
    // req body -> data
    // username or email
    //find the user
    //password check
    //access and referesh token
    //send cookie

    const {email , username , password} = req.body 

    if (!username && !email) {
        throw new ApiError(400, "username or email is required")
    }
    
    const user = await User.findOne({
        $or: [{username}, {email}]
    })

    const isPasswordCorrect = user.isPasswordCorrect(password)

    if(!isPasswordCorrect){
        throw new ApiError(401, "Invalid user credentials")
    }

    const {accessToken, refreshToken} = await generateAccessAndRefereshTokens(user._id)

    const loggedInUser = await User.findById(user._id).select("-password -refreshToken")

    const options = {
        httpOnly: true,
        secure: true
    }

    return res
    .status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken, options)
    .json(
        new ApiResponse(
            200, 
            {
                user: loggedInUser, accessToken, refreshToken
            },
            "User logged In Successfully"
        )
    )

})

const logoutUser = asyncHandler(async(req, res) => {
    await User.findByIdAndUpdate(
        req.user._id,
        {
            $unset: {
                refreshToken: 1 // this removes the field from document
            }
        },
        {
            new: true
        }
    )

    // console.log(req.user)

    const options = {
        httpOnly: true,
        secure: true
    }

    return res
    .status(200)
    .clearCookie("accessToken", options)
    .clearCookie("refreshToken", options)
    .json(new ApiResponse(200, {}, "User logged Out"))
})

const changeCurrentPassword = asyncHandler( async(req , res) => {

    const {oldPassword , newPassword} = req.body

    const user = await User.findById(req.user?._id)
    
    if(!(user.isPasswordCorrect(oldPassword))){
        throw new ApiError(400 , "Invalid old Password")
    }
    
    if(oldPassword === newPassword){
        throw new ApiError(400 , "Oldpassword and Newpassword is same")
    }
    

    user.password = newPassword

    await user.save({validateBeforeSave : false})

    return res
    .status(200)
    .json(new ApiResponse(200 , user.password , "Password changed successfully"))

})

const getCurrentUser = asyncHandler(async(req, res) => {
    return res
    .status(200)
    .json(new ApiResponse(
        200,
        req.user,
        "User fetched successfully"
    ))
})

const deleteAccount = asyncHandler( async(req , res) => {

    const user = req.user
    const deleteResult = await User.findByIdAndDelete(req.user?._id)
    
    if(!deleteResult){
        throw new ApiError(400 , "User not found")
    }
    
    if(user.avatarId){
        await deleteOnClodinary(user.avatarId)
    }

    if(user.coverImageId){
        await deleteOnClodinary(user.coverImageId)
    }

    console.log(deleteResult)
    return res
    .status(200)
    .json(
        new ApiResponse(200 , deleteResult , "User deleted")
    )

})

const changeAvatar = asyncHandler( async(req , res) => {

    const newAvatarLocal = req.file?.path

    if(!newAvatarLocal){
        throw new ApiError(400 , "avatar file is missing")
    }
    // console.log(req.user)
    const oldAvatarId = req.user?.avatarId
    
    const newAvatar = await uploadOnCloudinary(newAvatarLocal);
    
    if(!newAvatar.url){
        throw new ApiError(500 , "Error while uploading on cloud")
    }
    
    const deletion = await deleteOnClodinary(req.user?.avatarId);

    if(deletion.result !== "ok"){
        throw new ApiError(500 , "Error while deleting image from cloudinary")
    }
    
    const user =  await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set:{
                avatar: newAvatar.url,
                avatarId: newAvatar.public_id
            }
        },
        {
            new : true
        }
    ).select("-password -refreshToken")
    
    return res
    .status(200)
    .json(
        new ApiResponse(200 , user , "Avatar image updated")
    )
})

const updateUserCoverImage = asyncHandler(async(req, res) => {
    const coverImageLocalPath = req.file?.path

    if (!coverImageLocalPath) {
        throw new ApiError(400, "Cover image file is missing")
    }

    //TODO: delete old image - assignment
    const oldAvatarId = req.user?.avatarId


    const coverImage = await uploadOnCloudinary(coverImageLocalPath)

    if (!coverImage.url) {
        throw new ApiError(400, "Error while uploading on avatar")
        
    }

    const deletion = await deleteOnClodinary(req.user?.avatarId);

    if(deletion.result !== "ok"){
        throw new ApiError(500 , "Error while deleting image from cloudinary")
    }

    const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set:{
                coverImage: coverImage.url
            }
        },
        {new: true}
    ).select("-password")

    return res
    .status(200)
    .json(
        new ApiResponse(200, user, "Cover image updated successfully")
    )
})






export {
    registerUser,
    loginUser,
    logoutUser,
    changeCurrentPassword,
    getCurrentUser,
    changeAvatar,
    deleteAccount,
    updateUserCoverImage
}