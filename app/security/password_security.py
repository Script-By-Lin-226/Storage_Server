from passlib.context import CryptContext

passwd = CryptContext(schemes=["bcrypt"], deprecated="auto")

async def get_password_hash(password:str) -> str:
    return passwd.hash(password)

def verify_password(plain_password:str, hashed_password:str) -> bool:
    return passwd.verify(plain_password, hashed_password)