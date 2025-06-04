'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Make userId nullable in progress_reports table
    await queryInterface.changeColumn('progress_reports', 'userId', {
      type: Sequelize.INTEGER,
      allowNull: true, // Changed from false to true
      references: {
        model: 'users',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL'
    });

    console.log('Successfully made userId nullable in progress_reports table');
  },

  async down(queryInterface, Sequelize) {
    // Revert: Make userId NOT NULL again
    // First, we need to handle any existing NULL values by setting default user
    await queryInterface.sequelize.query(`
      UPDATE progress_reports 
      SET userId = 1 
      WHERE userId IS NULL 
      AND EXISTS (SELECT 1 FROM users WHERE id = 1)
    `);

    await queryInterface.changeColumn('progress_reports', 'userId', {
      type: Sequelize.INTEGER,
      allowNull: false, // Revert back to not null
      references: {
        model: 'users',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE'
    });

    console.log('Reverted userId to NOT NULL in progress_reports table');
  }
}; 