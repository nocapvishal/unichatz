import { Router } from "express";
import { authMiddleware } from "../middleware/auth.middleware";
import * as authController from "../controllers/auth.controller";

const router = Router();

router.post("/send-otp", authController.sendOtp);
router.post("/register", authController.register);
router.post("/signup", authController.register);
router.post("/login", authController.login);
router.post("/forgot-password", authController.forgotPassword);
router.post("/reset-password", authController.resetPassword);
router.post("/refresh", authController.refresh);
router.post("/logout", authController.logout);
router.get("/me", authMiddleware, authController.getMe);
router.post("/check-user", authController.checkUser);

export const authRoutes = router;
export default router;
