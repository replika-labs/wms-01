'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('progress_reports', 'tailorName', {
      type: Sequelize.STRING,
      allowNull: true,
      after: 'note' // Add after the note column
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn('progress_reports', 'tailorName');
  }
};
