from fastapi import FastAPI, APIRouter, HTTPException
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional
import uuid
from datetime import datetime
from enum import Enum

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Create the main app without a prefix
app = FastAPI()

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# Enums
class OperationType(str, Enum):
    VENTA = "Venta"
    COMPRA = "Compra"

class CryptoType(str, Enum):
    USDT = "USDT"
    BTC = "BTC"
    ETH = "ETH"
    BNB = "BNB"

class FiatType(str, Enum):
    EUR = "EUR"
    USD = "USD"
    VES = "VES"
    MXN = "MXN"
    COP = "COP"
    ARS = "ARS"
    BRL = "BRL"

class ExchangeType(str, Enum):
    BINANCE = "Binance"
    BYBIT = "Bybit"
    OKX = "OKX"
    KUCOIN = "KuCoin"

# Models
class StatusCheck(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    client_name: str
    timestamp: datetime = Field(default_factory=datetime.utcnow)

class StatusCheckCreate(BaseModel):
    client_name: str

class Operation(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    order_id: str
    exchange: ExchangeType
    operation_type: OperationType
    crypto: CryptoType
    fiat: FiatType
    crypto_amount: float
    exchange_rate: float
    fee: float = 0.0
    fiat_amount: float
    profit_loss: float = 0.0
    timestamp: datetime = Field(default_factory=datetime.utcnow)

class OperationCreate(BaseModel):
    user_id: str
    exchange: ExchangeType
    operation_type: OperationType
    crypto: CryptoType
    fiat: FiatType
    crypto_amount: float
    exchange_rate: float
    fee: float = 0.0

class P2PSimulation(BaseModel):
    crypto: CryptoType
    fiat: FiatType
    exchange: ExchangeType
    operation_type: OperationType
    amount: float
    exchange_rate: float
    fee: float = 0.0

class P2PResult(BaseModel):
    operation_type: OperationType
    crypto: CryptoType
    fiat: FiatType
    amount_sent: float
    amount_received: float
    fee: float
    net_amount: float
    exchange_rate: float

class ArbitrageCalculation(BaseModel):
    buy_exchange: ExchangeType
    sell_exchange: ExchangeType
    crypto: CryptoType
    buy_price: float
    sell_price: float
    amount: float
    buy_fee: float = 0.0
    sell_fee: float = 0.0

class ArbitrageResult(BaseModel):
    buy_exchange: ExchangeType
    sell_exchange: ExchangeType
    crypto: CryptoType
    investment: float
    revenue: float
    total_fees: float
    profit: float
    profit_percentage: float

class DashboardStats(BaseModel):
    total_operations: int
    total_profit_usdt: float
    total_profit_eur: float
    total_profit_usd: float
    best_operation: Optional[Operation] = None
    worst_operation: Optional[Operation] = None
    monthly_profit: float
    success_rate: float

# Basic routes
@api_router.get("/")
async def root():
    return {"message": "JJXCAPITAL ⚡ - Seguridad, velocidad y confianza"}

@api_router.post("/status", response_model=StatusCheck)
async def create_status_check(input: StatusCheckCreate):
    status_dict = input.dict()
    status_obj = StatusCheck(**status_dict)
    _ = await db.status_checks.insert_one(status_obj.dict())
    return status_obj

@api_router.get("/status", response_model=List[StatusCheck])
async def get_status_checks():
    status_checks = await db.status_checks.find().to_list(1000)
    return [StatusCheck(**status_check) for status_check in status_checks]

# P2P Simulation
@api_router.post("/simulate/p2p", response_model=P2PResult)
async def simulate_p2p(simulation: P2PSimulation):
    try:
        if simulation.operation_type == OperationType.VENTA:
            # Selling crypto, receiving fiat
            gross_fiat = simulation.amount * simulation.exchange_rate
            net_fiat = gross_fiat - simulation.fee
            
            return P2PResult(
                operation_type=simulation.operation_type,
                crypto=simulation.crypto,
                fiat=simulation.fiat,
                amount_sent=simulation.amount,
                amount_received=gross_fiat,
                fee=simulation.fee,
                net_amount=net_fiat,
                exchange_rate=simulation.exchange_rate
            )
        else:
            # Buying crypto with fiat
            gross_crypto = simulation.amount / simulation.exchange_rate
            net_crypto = gross_crypto - simulation.fee
            
            return P2PResult(
                operation_type=simulation.operation_type,
                crypto=simulation.crypto,
                fiat=simulation.fiat,
                amount_sent=simulation.amount,
                amount_received=gross_crypto,
                fee=simulation.fee,
                net_amount=net_crypto,
                exchange_rate=simulation.exchange_rate
            )
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

# Arbitrage Calculation
@api_router.post("/simulate/arbitrage", response_model=ArbitrageResult)
async def simulate_arbitrage(arbitrage: ArbitrageCalculation):
    try:
        # Calculate investment (buying)
        investment = arbitrage.amount * arbitrage.buy_price + arbitrage.buy_fee
        
        # Calculate revenue (selling)
        revenue = arbitrage.amount * arbitrage.sell_price - arbitrage.sell_fee
        
        # Calculate profit
        total_fees = arbitrage.buy_fee + arbitrage.sell_fee
        profit = revenue - investment
        profit_percentage = (profit / investment) * 100 if investment > 0 else 0
        
        return ArbitrageResult(
            buy_exchange=arbitrage.buy_exchange,
            sell_exchange=arbitrage.sell_exchange,
            crypto=arbitrage.crypto,
            investment=investment,
            revenue=revenue,
            total_fees=total_fees,
            profit=profit,
            profit_percentage=profit_percentage
        )
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

# Operations CRUD
@api_router.post("/operations", response_model=Operation)
async def create_operation(operation_data: OperationCreate):
    try:
        # Calculate fiat amount based on operation type
        if operation_data.operation_type == OperationType.VENTA:
            fiat_amount = operation_data.crypto_amount * operation_data.exchange_rate - operation_data.fee
        else:
            fiat_amount = (operation_data.crypto_amount - operation_data.fee) / operation_data.exchange_rate
        
        operation = Operation(
            **operation_data.dict(),
            order_id=str(int(datetime.now().timestamp() * 1000)),
            fiat_amount=fiat_amount
        )
        
        await db.operations.insert_one(operation.dict())
        return operation
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@api_router.get("/operations/{user_id}", response_model=List[Operation])
async def get_user_operations(user_id: str):
    try:
        operations = await db.operations.find({"user_id": user_id}).sort("timestamp", -1).to_list(1000)
        return [Operation(**op) for op in operations]
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@api_router.get("/dashboard/{user_id}", response_model=DashboardStats)
async def get_dashboard_stats(user_id: str):
    try:
        operations = await db.operations.find({"user_id": user_id}).to_list(1000)
        
        if not operations:
            return DashboardStats(
                total_operations=0,
                total_profit_usdt=0.0,
                total_profit_eur=0.0,
                total_profit_usd=0.0,
                monthly_profit=0.0,
                success_rate=0.0
            )
        
        operations_objs = [Operation(**op) for op in operations]
        
        # Calculate totals
        total_profit_usdt = sum(op.fiat_amount for op in operations_objs if op.crypto == CryptoType.USDT)
        total_profit_eur = sum(op.fiat_amount for op in operations_objs if op.fiat == FiatType.EUR)
        total_profit_usd = sum(op.fiat_amount for op in operations_objs if op.fiat == FiatType.USD)
        
        # Find best and worst operations
        best_op = max(operations_objs, key=lambda x: x.fiat_amount)
        worst_op = min(operations_objs, key=lambda x: x.fiat_amount)
        
        # Calculate monthly profit (last 30 days)
        from datetime import timedelta
        thirty_days_ago = datetime.utcnow() - timedelta(days=30)
        monthly_ops = [op for op in operations_objs if op.timestamp >= thirty_days_ago]
        monthly_profit = sum(op.fiat_amount for op in monthly_ops)
        
        # Success rate (assuming positive fiat_amount is success)
        successful_ops = len([op for op in operations_objs if op.fiat_amount > 0])
        success_rate = (successful_ops / len(operations_objs)) * 100 if operations_objs else 0
        
        return DashboardStats(
            total_operations=len(operations_objs),
            total_profit_usdt=total_profit_usdt,
            total_profit_eur=total_profit_eur,
            total_profit_usd=total_profit_usd,
            best_operation=best_op,
            worst_operation=worst_op,
            monthly_profit=monthly_profit,
            success_rate=success_rate
        )
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()