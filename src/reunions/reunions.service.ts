import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Reunion } from './entities/reunion.entity';
import { CreateReunionDto } from './dto/create-reunion.dto';

@Injectable()
export class ReunionService {
  constructor(
    @InjectRepository(Reunion)
    private readonly reunionRepository: Repository<Reunion>,
  ) {}

  async createReunion(createReunionDto: CreateReunionDto): Promise<Reunion> {
    const reunion = this.reunionRepository.create(createReunionDto);
    return this.reunionRepository.save(reunion);
  }

  async findAll(): Promise<Reunion[]> {
    return this.reunionRepository.find({ relations: ['points'] }); // Incluir los puntos relacionados
  }

  async findOne(id: number): Promise<Reunion> {
    const reunion = await this.reunionRepository.findOne({
      where: { id },
      relations: ['points'],
    });
    if (!reunion) {
      throw new NotFoundException(`Reunion with ID ${id} not found`);
    }
    return reunion;
  }

  async updateReunion(
    id: number,
    updateData: Partial<Reunion>,
  ): Promise<Reunion> {
    const reunion = await this.findOne(id);
    Object.assign(reunion, updateData);
    return this.reunionRepository.save(reunion);
  }

  async deleteReunion(id: number): Promise<void> {
    const result = await this.reunionRepository.delete(id);
    if (result.affected === 0) {
      throw new NotFoundException(`Reunion with ID ${id} not found`);
    }
  }
}
