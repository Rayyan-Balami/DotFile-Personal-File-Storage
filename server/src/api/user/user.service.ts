import userDAO from './user.dao';
import { CreateUserDTO, UpdateUserDTO } from './user.dto';

class UserService {
  async createUser(data: CreateUserDTO) {
    return await userDAO.create(data);
  }

  async updateUser(id: string, data: UpdateUserDTO) {
    return await userDAO.update(id, data);
  }

  async getUserById(id: string) {
    return await userDAO.findById(id);
  }

  async getAllUsers() {
    return await userDAO.findAll();
  }

  async deleteUser(id: string) {
    return await userDAO.delete(id);
  }
}

export default new UserService();
