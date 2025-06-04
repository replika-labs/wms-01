'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    /**
     * Add whatsappPhone column to users table
     */
    await queryInterface.addColumn('users', 'whatsappPhone', {
      type: Sequelize.STRING,
      allowNull: true,
      comment: 'WhatsApp phone number for user communication'
    });

    console.log('Successfully added whatsappPhone column to users table');
  },

  async down(queryInterface, Sequelize) {
    /**
     * Remove whatsappPhone column from users table
     */
    await queryInterface.removeColumn('users', 'whatsappPhone');

    console.log('Successfully removed whatsappPhone column from users table');
  }
}; 