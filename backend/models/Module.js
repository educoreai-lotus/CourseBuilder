/**
 * Module Model
 */

export class Module {
  constructor(data) {
    this.id = data.id;
    this.topic_id = data.topic_id;
    this.module_name = data.module_name;
    this.module_description = data.module_description;
  }

  static fromRow(row) {
    return new Module({
      id: row.id,
      topic_id: row.topic_id,
      module_name: row.module_name,
      module_description: row.module_description
    });
  }

  toJSON() {
    return {
      id: this.id,
      topic_id: this.topic_id,
      module_name: this.module_name,
      module_description: this.module_description
    };
  }
}




