import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Delete,
  Patch,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { CreateUserDto } from './dto/create-user.dto';
import { LoginUserDto } from './dto/login-user.dto';
import { GetUser } from './decorators/get-user.decorator';
import { User } from './entities/user.entity';
import { ValidRoles } from './interfaces/valid-roles';
import { Auth } from './decorators/auth.decorator';
import { UpdateUserDto } from './dto/update-user.dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  create(@Body() createUserDto: CreateUserDto) {
    return this.authService.create(createUserDto);
  }

  @Post('login')
  login(@Body() LoginUserDto: LoginUserDto) {
    return this.authService.login(LoginUserDto);
  }

  @Get('private')
  @Auth(ValidRoles.superUser, ValidRoles.admin)
  testingPrivateRoute(@GetUser() user: User) {
    return {
      ok: true,
      message: 'hola mundo',
      user,
    };
  }

  @Get('users')
  findAll() {
    return this.authService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.authService.findOne(id);
  }

  @Patch('/superadmin/:id')
  @Auth(ValidRoles.superUser)
  updateSuperAdmin(
    @Param('id') id: string,
    @Body() updateAuthDto: UpdateUserDto,
  ) {
    return this.authService.updateUserSuperAdmin(id, updateAuthDto);
  }

  @Patch()
  @Auth()
  update(@Body() updateAuthDto: UpdateUserDto, @GetUser() user: User) {
    return this.authService.updateUser(updateAuthDto, user);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.authService.remove(id);
  }
}
