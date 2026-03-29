import { Injectable } from '@nestjs/common';
import { UserService } from '../user/user.service';
import { User } from '../generated/prisma/client';
import * as bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class AuthService {
  constructor(
    private readonly userService: UserService,
    private readonly jwtService: JwtService,
  ) {}

  async validateUser(email: string, password: string): Promise<User | null> {
    const user = await this.userService.findUser(email);
    if (user && user.password) {
      if (await bcrypt.compare(password, user.password)) {
        const { password: _password, ...result } = user;
        return result as unknown as User;
      }
      return null;
    }
    return null;
  }

  login(user: User) {
    const payload = { email: user.email, sub: user.id };
    return { access_token: this.jwtService.sign(payload) };
  }
}
