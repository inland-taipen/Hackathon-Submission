"""
Setup script for RL environment for Slack clone.
"""
from setuptools import setup, find_packages

setup(
    name="rl_env",
    version="0.1.0",
    description="Reinforcement Learning environment for Slack clone",
    author="Your Name",
    py_modules=["slack_gym_env"],
    packages=find_packages(),
    install_requires=[
        "gymnasium>=0.29.0",
        "numpy>=1.23.0",
        "requests>=2.31.0",
        "python-socketio[client]>=5.9.0",
        "websocket-client>=1.6.1",
        "python-dotenv>=1.0.0",
    ],
    python_requires=">=3.8",
)

