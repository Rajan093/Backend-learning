import { Router } from "express";
import { 
    changeAvatar, 
    changeCurrentPassword, 
    deleteAccount, 
    getCurrentUser, 
    loginUser, 
    logoutUser, 
    registerUser, 
    updateUserCoverImage
} from "../controllers/user.controllers.js";
import {upload} from "../middlewares/multer.middleware.js"
import { verifyJWT } from "../middlewares/auth.middleware.js";


const router = Router()

router.route("/register").post(
    upload.fields([
        {
            name: "avatar",
            maxCount: 1
        }, 
        {
            name: "coverImage",
            maxCount: 1
        }
    ]),
    registerUser
    )


//secured routes
router.route("/login").post(loginUser);
router.route("/logout").post(verifyJWT , logoutUser);
router.route("/change-password").patch(verifyJWT , changeCurrentPassword);
router.route("/current-user").get(verifyJWT, getCurrentUser);
router.route("/deleteAccount").delete(verifyJWT , deleteAccount);
router.route("/change-avatar").patch(verifyJWT, upload.single("avatar"), changeAvatar);
router.route("/cover-image").patch(verifyJWT, upload.single("coverImage"), updateUserCoverImage)







export default router