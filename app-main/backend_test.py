import requests
import sys
import json
from datetime import datetime
import uuid

class JJXCapitalAPITester:
    def __init__(self, base_url="https://arbtrade-dash.preview.emergentagent.com/api"):
        self.base_url = base_url
        self.tests_run = 0
        self.tests_passed = 0
        self.test_user_id = str(uuid.uuid4())

    def run_test(self, name, method, endpoint, expected_status, data=None):
        """Run a single API test"""
        url = f"{self.base_url}/{endpoint}" if endpoint else self.base_url
        headers = {'Content-Type': 'application/json'}

        self.tests_run += 1
        print(f"\n🔍 Testing {name}...")
        print(f"URL: {url}")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=headers, timeout=10)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=headers, timeout=10)

            print(f"Response Status: {response.status_code}")
            
            success = response.status_code == expected_status
            if success:
                self.tests_passed += 1
                print(f"✅ Passed - Status: {response.status_code}")
                try:
                    response_data = response.json()
                    print(f"Response: {json.dumps(response_data, indent=2, default=str)}")
                    return True, response_data
                except:
                    print("Response: Non-JSON response")
                    return True, {}
            else:
                print(f"❌ Failed - Expected {expected_status}, got {response.status_code}")
                try:
                    error_data = response.json()
                    print(f"Error: {json.dumps(error_data, indent=2)}")
                except:
                    print(f"Error: {response.text}")
                return False, {}

        except Exception as e:
            print(f"❌ Failed - Error: {str(e)}")
            return False, {}

    def test_root_endpoint(self):
        """Test the root API endpoint"""
        return self.run_test("Root Endpoint", "GET", "", 200)

    def test_p2p_simulation_venta(self):
        """Test P2P simulation for selling crypto"""
        data = {
            "crypto": "USDT",
            "fiat": "EUR",
            "exchange": "Binance",
            "operation_type": "Venta",
            "amount": 100.0,
            "exchange_rate": 0.95,
            "fee": 2.0
        }
        return self.run_test("P2P Simulation - Venta", "POST", "simulate/p2p", 200, data)

    def test_p2p_simulation_compra(self):
        """Test P2P simulation for buying crypto"""
        data = {
            "crypto": "BTC",
            "fiat": "USD",
            "exchange": "Bybit",
            "operation_type": "Compra",
            "amount": 1000.0,
            "exchange_rate": 45000.0,
            "fee": 0.001
        }
        return self.run_test("P2P Simulation - Compra", "POST", "simulate/p2p", 200, data)

    def test_arbitrage_simulation(self):
        """Test arbitrage calculation"""
        data = {
            "buy_exchange": "Binance",
            "sell_exchange": "OKX",
            "crypto": "ETH",
            "buy_price": 2500.0,
            "sell_price": 2520.0,
            "amount": 1.0,
            "buy_fee": 2.5,
            "sell_fee": 2.52
        }
        return self.run_test("Arbitrage Simulation", "POST", "simulate/arbitrage", 200, data)

    def test_create_operation(self):
        """Test creating a new operation"""
        data = {
            "user_id": self.test_user_id,
            "exchange": "KuCoin",
            "operation_type": "Venta",
            "crypto": "USDT",
            "fiat": "EUR",
            "crypto_amount": 500.0,
            "exchange_rate": 0.94,
            "fee": 5.0
        }
        success, response = self.run_test("Create Operation", "POST", "operations", 200, data)
        if success and 'id' in response:
            self.operation_id = response['id']
            return True, response
        return False, {}

    def test_get_user_operations(self):
        """Test getting user operations"""
        return self.run_test("Get User Operations", "GET", f"operations/{self.test_user_id}", 200)

    def test_get_dashboard_stats(self):
        """Test getting dashboard statistics"""
        return self.run_test("Get Dashboard Stats", "GET", f"dashboard/{self.test_user_id}", 200)

    def test_invalid_p2p_data(self):
        """Test P2P simulation with invalid data"""
        data = {
            "crypto": "INVALID_CRYPTO",
            "fiat": "EUR",
            "exchange": "Binance",
            "operation_type": "Venta",
            "amount": 100.0,
            "exchange_rate": 0.95,
            "fee": 2.0
        }
        return self.run_test("P2P Simulation - Invalid Data", "POST", "simulate/p2p", 422, data)

    def test_mathematical_accuracy(self):
        """Test mathematical accuracy of calculations"""
        print("\n🧮 Testing Mathematical Accuracy...")
        
        # Test P2P Venta calculation
        data = {
            "crypto": "USDT",
            "fiat": "EUR", 
            "exchange": "Binance",
            "operation_type": "Venta",
            "amount": 100.0,
            "exchange_rate": 0.95,
            "fee": 2.0
        }
        
        success, response = self.run_test("Math Check - P2P Venta", "POST", "simulate/p2p", 200, data)
        if success:
            expected_gross = 100.0 * 0.95  # 95.0
            expected_net = expected_gross - 2.0  # 93.0
            
            if (response.get('amount_received') == expected_gross and 
                response.get('net_amount') == expected_net):
                print("✅ P2P Venta calculations are correct")
            else:
                print(f"❌ P2P Venta calculations incorrect. Expected gross: {expected_gross}, net: {expected_net}")
                print(f"Got gross: {response.get('amount_received')}, net: {response.get('net_amount')}")

        # Test Arbitrage calculation
        arb_data = {
            "buy_exchange": "Binance",
            "sell_exchange": "OKX", 
            "crypto": "BTC",
            "buy_price": 45000.0,
            "sell_price": 45500.0,
            "amount": 1.0,
            "buy_fee": 50.0,
            "sell_fee": 55.0
        }
        
        success, response = self.run_test("Math Check - Arbitrage", "POST", "simulate/arbitrage", 200, arb_data)
        if success:
            expected_investment = 1.0 * 45000.0 + 50.0  # 45050.0
            expected_revenue = 1.0 * 45500.0 - 55.0     # 45445.0
            expected_profit = expected_revenue - expected_investment  # 395.0
            expected_percentage = (expected_profit / expected_investment) * 100  # ~0.877%
            
            if (abs(response.get('investment', 0) - expected_investment) < 0.01 and
                abs(response.get('revenue', 0) - expected_revenue) < 0.01 and
                abs(response.get('profit', 0) - expected_profit) < 0.01):
                print("✅ Arbitrage calculations are correct")
            else:
                print(f"❌ Arbitrage calculations incorrect")
                print(f"Expected: investment={expected_investment}, revenue={expected_revenue}, profit={expected_profit}")
                print(f"Got: investment={response.get('investment')}, revenue={response.get('revenue')}, profit={response.get('profit')}")

def main():
    print("🚀 Starting JJXCAPITAL ⚡ API Testing Suite")
    print("=" * 60)
    
    tester = JJXCapitalAPITester()
    
    # Test all endpoints
    tester.test_root_endpoint()
    tester.test_p2p_simulation_venta()
    tester.test_p2p_simulation_compra()
    tester.test_arbitrage_simulation()
    tester.test_create_operation()
    tester.test_get_user_operations()
    tester.test_get_dashboard_stats()
    tester.test_invalid_p2p_data()
    tester.test_mathematical_accuracy()
    
    # Print final results
    print("\n" + "=" * 60)
    print(f"📊 FINAL RESULTS: {tester.tests_passed}/{tester.tests_run} tests passed")
    
    if tester.tests_passed == tester.tests_run:
        print("🎉 All tests passed! Backend is ready for production.")
        return 0
    else:
        print("⚠️  Some tests failed. Please review the issues above.")
        return 1

if __name__ == "__main__":
    sys.exit(main())