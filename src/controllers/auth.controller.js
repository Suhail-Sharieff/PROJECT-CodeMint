import { asyncHandler } from "../utils/asyncHandler.js";
import SERVER_LOG from "../utils/server_log.js";
import { User } from "../models/user.model.js";
import { ApiError } from "../utils/api_error.js";
import { ApiResponse } from "../utils/api_response.js";
import { get_refresh_access_token } from "../utils/token_generator.js";

const registerUser = asyncHandler(
    async (req, res) => {
        SERVER_LOG("Registering user")
        const { email, password } = req.body;
        console.log(`recived body for post method register: ${JSON.stringify(req.body)}`);
        if (
            [email, password]
                .some(
                    (e) => e?.trim() === ""
                )
        ) {
            throw new ApiError(400, "Email/Password cannot be empty !");
        }
        //now fields r valid
        //step2: check if user already exists in DB
        console.log("Checking if user already exists.....");
        const userAlreadyExists = await User.findOne({
            $or: [
                { email: email }        // Check if email exists
            ]
        });
        if (userAlreadyExists) {
            throw new ApiError(400, "Username/Email already exists!");
        }

        //store in mongo
        const userCreatedInDB = await User.create(
            {
                password: password,
                email: email
            }
        );

        console.log("Cheking if user is registered sucessfully....");
        //check if user created is successfulll, by finding generated id
        const user = await User.findById(
            userCreatedInDB._id
        ).select(
            "-password -refreshToken"  //try selecting all feilds except password and refreshToken
        )

        if (!user) {
            throw new ApiError(400, "Failed to register user!")
        }


        //send success reponse
        console.log(`User registered sucessfully`);
        return res
            .status(200)
            .json(
                new ApiResponse(
                    200,
                    user,
                    `User created succeesfully: User: ${JSON.stringify(user)}`
                )
            );
    }
)


const loginUser=asyncHandler(
    async(req,res)=>{
        SERVER_LOG("Login User")
        console.log("Fetching UI data for login...");
        console.log(`Body received for login: ${JSON.stringify(req.body)}`);
        const { email, password } = req.body;
        if(!(password&&email)) throw new ApiError("Password/email cant be empty!")


         console.log("Checking if user is registered....");

        const user = await User.findOne(
            {
                email:email
            }
        )

        if (!user) {
            throw new ApiError(400, "Invalid credentials!")
        }

        console.log(`User do exists..matching password...`);
        const passwordCorrect = await user.isPasswordCorrect(password);//we have defined this method in _01_user.models.js
        if (!passwordCorrect) {
            throw new ApiError(401, "Invalid Credentials!")
        }
        console.log("User login sucess");

        console.log("Starting generation of refresh token and passing them as cookies so that user data can be accessed via cookies in logged in session...");

        const { accessToken, refreshToken } = await get_refresh_access_token(user._id)

        console.log("Sent these tokens as cookies for logged session...");

        return res
            .status(200)
            .cookie(//we have given our website cookie usng app.use(cookie-parser())
                "accessToken",
                accessToken,
                {
                    httpOnly: true,
                    secure: false
                }
            )
            .cookie(
                "refreshToken",
                refreshToken,
                {
                    httpOnly: true,
                    secure: false
                }
            )
            .json(
                new ApiResponse(
                    200,
                    {
                        user: user,
                        accessToken,//this and below is for like for ex mobile apps whcih doent use cookie
                        refreshToken
                    },
                    "Login session created!"
                )
            )



    }
)
const logoutUser = asyncHandler(
    async (req, res) => {
        SERVER_LOG("Logout user")
        if (!req.user) {
            throw new ApiError(400, "JWT failed to append user field to request while logging out...")
        }
        console.log("User field avaliable in req now...");

        console.log("Setting access token of user to undefined bfr logout...");

        const updatedUser = await User.findByIdAndUpdate(
            req.user._id,
            {
                $unset: {
                    refreshToken: 1
                }
            },
            {
                new: true,//now this returns updated user
            }
        )

        if (!updatedUser) {
            console.error("Failed to update user refresh token.");
            throw new ApiError(500, "Failed to update user refresh token.");
        }

        console.log("Set refresh token to undefined, logout sucess..");

        return res
            .status(200)
            .clearCookie("accessToken", { httpOnly: true, secure: false })
            .clearCookie("refreshToken", { httpOnly: true, secure: false })
            .json(
                new ApiResponse(
                    200,
                    updatedUser,
                    "Logout success"
                )
            )
    }
)

const refreshAccessToken = asyncHandler(async (req, res) => {
    SERVER_LOG("Refresh access token")
    const incomingRefreshToken = req.cookies.refreshToken || req.body.refreshToken

    if (!incomingRefreshToken) {
        throw new ApiError(401, "unauthorized request")
    }

    try {
        const decodedToken = jwt.verify(
            incomingRefreshToken,
            process.env.REFRESH_TOKEN_SECRET
        )

        const user = await User.findById(decodedToken?._id)

        if (!user) {
            throw new ApiError(401, "Invalid refresh token")
        }

        if (incomingRefreshToken !== user?.refreshToken) {
            throw new ApiError(401, "Refresh token is expired or used")

        }

        const options = {
            httpOnly: true,
            secure: true
        }

        const { accessToken, newRefreshToken } = await generateAccessAndRefereshTokens(user._id)

        return res
            .status(200)
            .cookie("accessToken", accessToken, options)
            .cookie("refreshToken", newRefreshToken, options)
            .json(
                new ApiResponse(
                    200,
                    { accessToken, refreshToken: newRefreshToken },
                    "Access token refreshed"
                )
            )
    } catch (error) {
        throw new ApiError(401, error?.message || "Invalid refresh token")
    }

})

/**Change password functionality */
// check if same, if yes update
const updatePassword = asyncHandler(
    async (req, res) => {
        SERVER_LOG("Update Password")
        const { oldPassword, newPassword } = req.body;

        console.log("Change password method called...");

        const user = await User.findById(req.user._id);
        const validReq = await user.isPasswordCorrect(oldPassword);

        if (!validReq) {
            throw new ApiError(400, "Incorrect old password!");
        }
        console.log("Saving new password...");
        user.password = newPassword
        await user.save({ validateBeforeSave: false })
        console.log("Password reset success...");
        return res
            .status(200)
            .json(
                new ApiResponse(
                    200,
                    "Password reset success"
                )
            )
    }
)
export {
    registerUser,
    loginUser,
    updatePassword,
    logoutUser
}