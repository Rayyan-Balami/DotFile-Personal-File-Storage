import { Request, Response } from 'express';
import userService from './user.service';

class UserController {
  async createUser(req: Request, res: Response) {
    const user = await userService.createUser(req.body);
    res.status(201).json(user);
  }

  async getAllUsers(req: Request, res: Response) {
    const users = await userService.getAllUsers();
    res.json(users);
  }

  async getUserById(req: Request, res: Response) {
    const user = await userService.getUserById(req.params.id);
    if (user) res.json(user);
    else res.status(404).json({ message: 'User not found' });
  }

  async updateUser(req: Request, res: Response) {
    const user = await userService.updateUser(req.params.id, req.body);
    if (user) res.json(user);
    else res.status(404).json({ message: 'User not found' });
  }

  async deleteUser(req: Request, res: Response) {
    const user = await userService.deleteUser(req.params.id);
    if (user) res.json({ message: 'User deleted' });
    else res.status(404).json({ message: 'User not found' });
  }
}

export default new UserController();
