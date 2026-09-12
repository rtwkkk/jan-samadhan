import { Pipeline, IPipeline, IPipelineStage } from '../models/Pipeline';
import { stripProtectedFields } from './BaseRepository';
import { randomUUID } from 'node:crypto';

export class PipelineRepository {
  static async findById(accountId: string, id: string): Promise<IPipeline | null> {
    return Pipeline.findOne({ _id: id, accountId }).lean();
  }

  static async findMany(accountId: string): Promise<IPipeline[]> {
    return Pipeline.find({ accountId }).lean();
  }

  static async create(data: Partial<IPipeline>): Promise<IPipeline> {
    const pipeline = new Pipeline(data);
    return pipeline.save();
  }

  static async updateById(accountId: string, id: string, update: Partial<IPipeline>): Promise<IPipeline | null> {
    const safeUpdate = stripProtectedFields(update);
    return Pipeline.findOneAndUpdate({ _id: id, accountId }, { $set: safeUpdate }, { new: true }).lean();
  }

  static async deleteById(accountId: string, id: string): Promise<boolean> {
    const result = await Pipeline.deleteOne({ _id: id, accountId });
    return result.deletedCount === 1;
  }

  /**
   * Appends a new stage to the end of a pipeline's stages array.
   * Uses the provided `id` as the stage identifier, or generates one.
   * Enforces accountId tenant isolation.
   */
  static async addStage(
    accountId: string,
    pipelineId: string,
    stage: Omit<IPipelineStage, 'id'> & { id?: string },
  ): Promise<IPipeline | null> {
    const stageWithId: IPipelineStage = {
      id: stage.id ?? randomUUID(),
      name: stage.name,
      position: stage.position ?? 0,
      color: stage.color ?? '#3b82f6',
    };
    return Pipeline.findOneAndUpdate(
      { _id: pipelineId, accountId },
      { $push: { stages: stageWithId } },
      { new: true },
    ).lean();
  }

  /**
   * Updates fields on a single embedded stage, matched by `stage.id`.
   * Enforces accountId tenant isolation.
   */
  static async updateStage(
    accountId: string,
    pipelineId: string,
    stageId: string,
    update: Partial<Pick<IPipelineStage, 'name' | 'color' | 'position'>>,
  ): Promise<IPipeline | null> {
    const setFields: Record<string, unknown> = {};
    if (update.name !== undefined) setFields['stages.$[s].name'] = update.name;
    if (update.color !== undefined) setFields['stages.$[s].color'] = update.color;
    if (update.position !== undefined) setFields['stages.$[s].position'] = update.position;

    return Pipeline.findOneAndUpdate(
      { _id: pipelineId, accountId },
      { $set: setFields },
      {
        new: true,
        arrayFilters: [{ 's.id': stageId }],
      },
    ).lean();
  }

  /**
   * Removes a stage from the pipeline's embedded stages array by stage.id.
   * Enforces accountId tenant isolation.
   * Caller is responsible for ensuring no Deals reference this stageId before calling.
   */
  static async removeStage(
    accountId: string,
    pipelineId: string,
    stageId: string,
  ): Promise<IPipeline | null> {
    return Pipeline.findOneAndUpdate(
      { _id: pipelineId, accountId },
      { $pull: { stages: { id: stageId } } },
      { new: true },
    ).lean();
  }

  /**
   * Replaces the entire stages array atomically (for batch reorder + rename).
   * Preserves existing stage ids — caller must supply all stages with their ids.
   * Enforces accountId tenant isolation.
   */
  static async updateStagesBatch(
    accountId: string,
    pipelineId: string,
    stages: IPipelineStage[],
  ): Promise<IPipeline | null> {
    return Pipeline.findOneAndUpdate(
      { _id: pipelineId, accountId },
      { $set: { stages } },
      { new: true },
    ).lean();
  }
}
