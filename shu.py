import shutil

total , used , free = shutil.disk_usage("/")
print(total)
print(used)
print(free / 1024**3)