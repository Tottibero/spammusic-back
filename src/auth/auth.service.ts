import {
  BadRequestException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { CreateUserDto } from './dto/create-user.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { User } from './entities/user.entity';
import { Repository } from 'typeorm';

import * as bcrypt from 'bcrypt';
import { LoginUserDto } from './dto/login-user.dto';
import { JwtPayload } from './interfaces/jwt-payload.interface';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly jwtService: JwtService,
  ) {}
  async create(createUserDto: CreateUserDto) {
    try {
      const { password, ...userData } = createUserDto;

      const user = this.userRepository.create({
        ...userData,
        password: bcrypt.hashSync(password, 10),
      });

      await this.userRepository.save(user);

      delete user.password;

      return {
        ...user,
        token: this.getJwtToken({
          username: user.username,
          id: user.id,
          roles: user.roles,
        }),
      };
    } catch (e) {
      this.handleDBerrors(e);
    }
  }

  async login(loginUserDto: LoginUserDto) {
    const { password, username } = loginUserDto;
    const user = await this.userRepository.findOne({
      where: { username },
      select: { username: true, password: true, id: true, roles: true },
    });

    if (!user) throw new UnauthorizedException('Credentials are not valid!');

    if (!bcrypt.compareSync(password, user.password))
      throw new UnauthorizedException('Credentials are not valid! pass');
    return {
      ...user,
      token: this.getJwtToken({
        username: user.username,
        id: user.id,
        roles: user.roles,
      }),
    };
  }

  async findAll() {
    try {
      const users = await this.userRepository.find({
        select: ['id', 'username', 'email', 'roles'], // Ajusta los campos que deseas incluir
      });

      // Opcional: si no quieres devolver la contraseña u otros datos sensibles
      return users.map((user) => {
        delete user.password;
        return user;
      });
    } catch (error) {
      this.handleDBerrors(error);
    }
  }

  async findOne(id: string): Promise<User> {
    try {
      const unit = await this.userRepository.findOneByOrFail({ id });
      return unit;
    } catch (error) {
      throw new NotFoundException(`User with id ${id} not found`);
    }
  }

  async updateUserSuperAdmin(
    id: string,
    updateData: Partial<User>,
  ): Promise<User> {
    const user = await this.findOne(id);

    if (updateData.password) {
      updateData.password = bcrypt.hashSync(updateData.password, 10);
    }

    Object.assign(user, updateData);
    return this.userRepository.save(user);
  }

  async updateUser(updateData: Partial<User>, user: User): Promise<User> {
    if (updateData.password) {
      updateData.password = bcrypt.hashSync(updateData.password, 10);
    }

    Object.assign(user, updateData);
    return this.userRepository.save(user);
  }

  async remove(id: string) {
    const user = await this.userRepository.delete({ id });
    return user;
  }

  private getJwtToken(payload: JwtPayload) {
    const token = this.jwtService.sign(payload);
    return token;
  }

  private handleDBerrors(error: any) {
    if (error.code === '23505') throw new BadRequestException(error.detail);
  }
}
