import { Router } from "express";
import { register, login, logout, 
    validation, update_password } from "../controllers/auth.controllers.js";

const router = Router();

router.post("/register", register);
router.post("/login", login);
router.post("/logout", logout);
router.post("/validation", validation);
router.post("/update_password", update_password);

export default router;