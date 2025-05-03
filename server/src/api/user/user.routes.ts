import { Router } from 'express';
import userController from './user.controller.js';
import { validate } from '../../middleware/validate.js';
import {
  loginUserSchema,
  registerUserSchema,
  updateUserSchema,
  updateUserPasswordSchema
} from './user.validator.js';
import asyncHandler from '../../utils/asyncHandler.js';

const router = Router();

// Auth routes
router.post(
  '/register',
  validate(registerUserSchema),
  asyncHandler(userController.register)
);

router.post(
  '/login',
  validate(loginUserSchema),
  asyncHandler(userController.login)
);

// User routes
router.get(
  '/',
  asyncHandler(userController.getAllUsers)
);

router.get(
  '/:id',
  asyncHandler(userController.getUserById)
);

router.put(
  '/:id',
  validate(updateUserSchema),
  asyncHandler(userController.updateUser)
);

router.patch(
  '/:id/password',
  validate(updateUserPasswordSchema),
  asyncHandler(userController.updateUserPassword)
);

router.delete(
  '/:id',
  asyncHandler(userController.deleteUser)
);

export default router;
