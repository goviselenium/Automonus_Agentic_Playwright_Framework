Feature: User Authentication & Product Selection

  Scenario: Standard User Purchases Backpack
    Given User is on the login page
    When User logs in with "standard_user" and "secret_sauce"
    And User adds "Sauce Labs Backpack" to cart
    And User opens shopping cart
    Then User should proceed to checkout
